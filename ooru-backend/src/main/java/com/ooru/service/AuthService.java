package com.ooru.service;

import com.ooru.dto.AuthDtos.*;
import com.ooru.model.Role;
import com.ooru.model.User;
import com.ooru.repository.UserRepository;
import com.ooru.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    // Swap this for a real SMS provider (MSG91, Twilio, etc.) client — see OtpService.
    private final OtpService otpService;

    private static final Set<String> SELF_SERVE_ROLES = Set.of("CUSTOMER", "SHOP_OWNER", "DELIVERY_PARTNER");

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                        JwtTokenProvider jwtTokenProvider, OtpService otpService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.otpService = otpService;
    }

    public void register(RegisterRequest req) {
        if (!SELF_SERVE_ROLES.contains(req.role)) {
            // ADMIN accounts are never created through the public API — see database/schema.sql
            // for how to seed the first admin directly in the database.
            throw new IllegalArgumentException("Invalid role for self-registration");
        }
        if (userRepository.existsByPhone(req.phone)) {
            throw new IllegalStateException("An account with this phone number already exists");
        }

        User user = new User();
        user.setName(req.name);
        user.setPhone(req.phone);
        user.setEmail(req.email);
        user.setPasswordHash(passwordEncoder.encode(req.password));
        user.setRole(Role.valueOf(req.role));
        userRepository.save(user);

        // Registration is not complete until the phone number is verified — see verifyOtp below.
        otpService.sendOtp(req.phone);
    }

    public void verifyOtp(OtpVerifyRequest req) {
        boolean ok = otpService.verifyOtp(req.phone, req.otp);
        if (!ok) {
            throw new IllegalArgumentException("Incorrect or expired OTP");
        }
        User user = userRepository.findByPhone(req.phone)
                .orElseThrow(() -> new IllegalStateException("No account for this phone number"));
        user.setPhoneVerified(true);
        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByPhone(req.phone)
                .orElseThrow(() -> new IllegalArgumentException("Incorrect phone number or password"));

        if (!passwordEncoder.matches(req.password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect phone number or password");
        }
        if (!user.isPhoneVerified()) {
            throw new IllegalStateException("Phone number not verified — request a new OTP");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getName(), user.getRole());
    }
}
