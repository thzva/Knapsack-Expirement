"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api-client"
import { Loader2, Mail, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AuthPage() {
    const router = useRouter()
    const [step, setStep] = useState<"email" | "code">("email")
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            await api.post('/auth/send-code', { email })
            setStep("code")
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Failed to send verification code")
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const response = await api.post<any>('/auth/verify-code', { email, code })

            if (response.success) {
                // Store participant ID and redirect (Session only)
                sessionStorage.setItem('participantId', response.participantId)
                sessionStorage.setItem('prolificPid', response.email) // Use email as PID for non-prolific users

                // Redirect to main experiment
                router.push('/')
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Invalid code. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <Card className="w-full max-w-md shadow-xl border-gray-200">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        {step === "email" ? "Sign in" : "Verify Email"}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {step === "email"
                            ? "Enter your email to receive a verification code"
                            : `We sent a code to ${email}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {step === "email" ? (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="pl-9"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Send Code
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyCode} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Verification Code</Label>
                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mb-2">
                                    <strong>Check your Spam/Junk folder!</strong><br />
                                    The email often lands there.
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="123456"
                                        className="pl-9 tracking-widest"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Verify
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => setStep("email")}
                                disabled={loading}
                            >
                                Back to Email
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4 text-xs text-muted-foreground">
                    Knapsack Experiment &copy; 2024
                </CardFooter>
            </Card>
        </div>
    )
}
