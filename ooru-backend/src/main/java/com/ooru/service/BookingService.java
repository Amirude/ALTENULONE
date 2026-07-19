package com.ooru.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ooru.dto.BookingDtos.*;
import com.ooru.dto.MenuDtos.OrderItemRequest;
import com.ooru.model.*;
import com.ooru.repository.BookingRepository;
import com.ooru.repository.MenuItemRepository;
import com.ooru.repository.ServiceCategoryRepository;
import com.ooru.repository.ShopRepository;
import com.ooru.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final SlotService slotService;
    private final NotificationService notificationService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private final com.ooru.repository.ReviewRepository reviewRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final java.util.Set<String> CART_BASED_CATEGORIES = java.util.Set.of("food", "grocery");

    public BookingService(BookingRepository bookingRepository, UserRepository userRepository,
                           ShopRepository shopRepository, ServiceCategoryRepository categoryRepository,
                           MenuItemRepository menuItemRepository, SlotService slotService,
                           NotificationService notificationService,
                           org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate,
                           com.ooru.repository.ReviewRepository reviewRepository) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.slotService = slotService;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.reviewRepository = reviewRepository;
    }

    public Booking create(Long customerUserId, CreateBookingRequest req) {
        ServiceCategory category = categoryRepository.findByCode(req.categoryCode)
                .filter(ServiceCategory::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Unknown or inactive service category: " + req.categoryCode));

        User customer = userRepository.findById(customerUserId)
                .orElseThrow(() -> new IllegalStateException("User not found"));

        Booking booking = new Booking();
        booking.setReference(generateReference());
        booking.setCustomer(customer);
        booking.setCategoryCode(category.getCode());
        booking.setStatus(BookingStatus.REQUESTED);

        Shop shop = null;
        if (req.shopId != null) {
            shop = shopRepository.findById(req.shopId)
                    .filter(s -> s.getStatus() == Shop.ShopStatus.APPROVED)
                    .orElseThrow(() -> new IllegalArgumentException("Shop not found or not approved"));
            booking.setShop(shop);
        }

        if (req.slotId != null) {
            if (shop == null) {
                throw new IllegalArgumentException("A shop must be selected to book a slot");
            }
            AppointmentSlot slot = slotService.claim(req.slotId, shop.getId());
            booking.setSlot(slot);
        }

        if (CART_BASED_CATEGORIES.contains(category.getCode())) {
            if (shop == null) {
                throw new IllegalArgumentException("A shop must be selected for food/grocery orders");
            }
            if (req.items == null || req.items.isEmpty()) {
                throw new IllegalArgumentException("Cart is empty — add at least one item");
            }
            booking.setDetailsJson(toJson(buildCartDetails(shop, req)));
        } else {
            // Simple field-based categories (tailor, xerox, ac, plumber, electrician, parcel, rental, driver, ...)
            // just pass their form fields straight through as strings, plus the claimed slot if any.
            Map<String, Object> details = new LinkedHashMap<>(req.details != null ? req.details : Map.of());
            if (booking.getSlot() != null) {
                AppointmentSlot slot = booking.getSlot();
                details.put("appointmentDate", slot.getDate().toString());
                details.put("appointmentTime", slot.getStartTime() + " - " + slot.getEndTime());
            }
            booking.setDetailsJson(toJson(details));
        }

        return bookingRepository.save(booking);
    }

    /** Looks up each cart item's CURRENT price from the shop's menu — never trusts a price the client might send. */
    private Map<String, Object> buildCartDetails(Shop shop, CreateBookingRequest req) {
        List<Map<String, Object>> lineItems = new ArrayList<>();
        long totalPaise = 0;

        for (OrderItemRequest item : req.items) {
            MenuItem menuItem = menuItemRepository.findById(item.menuItemId)
                    .filter(mi -> mi.getShop().getId().equals(shop.getId()) && mi.isActive())
                    .orElseThrow(() -> new IllegalArgumentException("Menu item " + item.menuItemId + " is not available at this shop"));

            long lineTotal = menuItem.getPricePaise() * item.quantity;
            totalPaise += lineTotal;

            Map<String, Object> line = new LinkedHashMap<>();
            line.put("menuItemId", menuItem.getId());
            line.put("name", menuItem.getName());
            line.put("quantity", item.quantity);
            line.put("unitPricePaise", menuItem.getPricePaise());
            line.put("lineTotalPaise", lineTotal);
            line.put("imageUrl", menuItem.getImageUrl());
            lineItems.add(line);
        }

        Map<String, Object> details = new LinkedHashMap<>(req.details != null ? req.details : Map.of());
        details.put("items", lineItems);
        details.put("totalPaise", totalPaise);
        return details;
    }

    public List<Booking> myBookings(Long customerUserId) {
        User customer = userRepository.findById(customerUserId)
                .orElseThrow(() -> new IllegalStateException("User not found"));
        return bookingRepository.findByCustomerOrderByCreatedAtDesc(customer);
    }

    /**
     * "Order again" — built entirely from this ONE customer's own past food/grocery orders, no
     * cross-customer data and no ML model. Just: which menu items have they ordered before, and
     * how often. Honest personalization, not a black box.
     */
    public List<Map<String, Object>> frequentlyOrderedItems(Long customerUserId, int limit) {
        User customer = userRepository.findById(customerUserId)
                .orElseThrow(() -> new IllegalStateException("User not found"));

        Map<Long, Integer> countByMenuItemId = new LinkedHashMap<>();
        for (Booking b : bookingRepository.findByCustomerOrderByCreatedAtDesc(customer)) {
            if (!CART_BASED_CATEGORIES.contains(b.getCategoryCode())) continue;
            Map<String, Object> details = parseDetails(b);
            Object itemsObj = details.get("items");
            if (!(itemsObj instanceof List<?> items)) continue;
            for (Object itemObj : items) {
                if (!(itemObj instanceof Map<?, ?> item)) continue;
                Object idObj = item.get("menuItemId");
                if (idObj == null) continue;
                Long menuItemId = ((Number) idObj).longValue();
                int qty = item.get("quantity") instanceof Number n ? n.intValue() : 1;
                countByMenuItemId.merge(menuItemId, qty, Integer::sum);
            }
        }

        return countByMenuItemId.entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                .limit(limit)
                .map(e -> menuItemRepository.findById(e.getKey()).filter(MenuItem::isActive).map(mi -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("menuItemId", mi.getId());
                    row.put("name", mi.getName());
                    row.put("pricePaise", mi.getPricePaise());
                    row.put("imageUrl", mi.getImageUrl());
                    row.put("shopId", mi.getShop().getId());
                    row.put("shopName", mi.getShop().getShopName());
                    row.put("categoryCode", mi.getShop().getCategoryCode());
                    row.put("timesOrdered", e.getValue());
                    return row;
                }).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    public List<Booking> shopBookings(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalStateException("Shop not found"));
        return bookingRepository.findByShopOrderByCreatedAtDesc(shop);
    }

    public Booking updateStatus(Long bookingId, BookingStatus newStatus) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalStateException("Booking not found"));
        booking.setStatus(newStatus);
        Booking saved = bookingRepository.save(booking);
        notificationService.notifyBookingStatusChanged(saved);
        messagingTemplate.convertAndSend(
                "/topic/customer/" + saved.getCustomer().getId() + "/bookings",
                toResponse(saved));
        return saved;
    }

    public Booking assignShop(Long bookingId, Long shopId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalStateException("Booking not found"));
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new IllegalStateException("Shop not found"));
        booking.setShop(shop);
        return bookingRepository.save(booking);
    }

    /**
     * Lets the customer choose pickup vs. delivery — but only after the shop has actually marked
     * the item COMPLETED (ready). Choosing this earlier wouldn't mean anything yet.
     */
    public Booking setFulfillment(Long customerUserId, Long bookingId, FulfillmentRequest req) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalStateException("Booking not found"));
        if (!booking.getCustomer().getId().equals(customerUserId)) {
            throw new IllegalStateException("This isn't your booking");
        }
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new IllegalStateException("This booking isn't ready yet");
        }
        if (!"PICKUP".equals(req.method) && !"DELIVERY".equals(req.method)) {
            throw new IllegalArgumentException("method must be PICKUP or DELIVERY");
        }
        if ("DELIVERY".equals(req.method) && (req.address == null || req.address.isBlank())) {
            throw new IllegalArgumentException("An address is required for delivery");
        }

        Map<String, Object> details = new LinkedHashMap<>(parseDetails(booking));
        details.put("fulfillmentMethod", req.method);
        if (req.address != null) details.put("fulfillmentAddress", req.address);
        booking.setDetailsJson(toJson(details));
        return bookingRepository.save(booking);
    }

    public Map<String, Object> parseDetails(Booking booking) {
        try {
            return objectMapper.readValue(booking.getDetailsJson(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupted booking details", e);
        }
    }

    /** Shared mapper so BookingController and AssistantController produce identical response shapes. */
    public BookingResponse toResponse(Booking booking) {
        BookingResponse res = new BookingResponse();
        res.id = booking.getId();
        res.reference = booking.getReference();
        res.categoryCode = booking.getCategoryCode();
        res.details = parseDetails(booking);
        res.status = booking.getStatus();
        res.shopId = booking.getShop() != null ? booking.getShop().getId() : null;
        res.shopName = booking.getShop() != null ? booking.getShop().getShopName() : null;
        res.hasReview = reviewRepository.existsByBooking(booking);
        res.createdAt = booking.getCreatedAt();
        res.updatedAt = booking.getUpdatedAt();
        return res;
    }

    private String toJson(Map<String, ?> details) {
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Could not serialize booking details", e);
        }
    }

    private String generateReference() {
        String suffix = RANDOM.ints(5, 0, ID_CHARS.length())
                .mapToObj(ID_CHARS::charAt)
                .map(String::valueOf)
                .collect(Collectors.joining());
        return "OOR-" + suffix;
    }
}
