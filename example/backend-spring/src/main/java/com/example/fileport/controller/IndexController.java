package com.example.fileport.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("pageTitle", "첨부파일 업로드");
        model.addAttribute("userId", "user01");
        return "index";
    }
}
