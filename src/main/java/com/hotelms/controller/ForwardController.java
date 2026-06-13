package com.hotelms.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ForwardController {

    @RequestMapping(value = {
        "/",
        "/login",
        "/register",
        "/admin/**",
        "/manager/**",
        "/reception/**",
        "/housekeep/**",
        "/customer/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
