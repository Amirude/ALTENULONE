package com.ooru.controller;

import com.ooru.model.ServiceCategory;
import com.ooru.repository.ServiceCategoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final ServiceCategoryRepository categoryRepository;

    public CategoryController(ServiceCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public ResponseEntity<List<ServiceCategory>> list() {
        return ResponseEntity.ok(categoryRepository.findByActiveTrue());
    }
}
