"use client"

import { useEffect } from "react"
import { api } from "@/lib/api-client"

export default function HealthCheck() {
    useEffect(() => {
        // Fire and forget - just to wake up server
        api.healthCheck().catch(() => {
            // Ignore errors, it's just a warm-up
            console.log("Backend warm-up ping failed (expected if offline)")
        })
    }, [])

    return null
}
