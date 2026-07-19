package com.ooru.controller;

import com.ooru.model.Shop;
import com.ooru.service.ShopService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ShopService shopService;

    public AdminController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping("/shops/pending")
    public ResponseEntity<List<Shop>> pendingShops() {
        return ResponseEntity.ok(shopService.pendingApproval());
    }

    @PatchMapping("/shops/{shopId}/approve")
    public ResponseEntity<Shop> approve(@PathVariable Long shopId) {
        return ResponseEntity.ok(shopService.setStatus(shopId, Shop.ShopStatus.APPROVED));
    }

    @PatchMapping("/shops/{shopId}/reject")
    public ResponseEntity<Shop> reject(@PathVariable Long shopId) {
        return ResponseEntity.ok(shopService.setStatus(shopId, Shop.ShopStatus.REJECTED));
    }

    @PatchMapping("/shops/{shopId}/suspend")
    public ResponseEntity<Shop> suspend(@PathVariable Long shopId) {
        return ResponseEntity.ok(shopService.setStatus(shopId, Shop.ShopStatus.SUSPENDED));
    }
}
