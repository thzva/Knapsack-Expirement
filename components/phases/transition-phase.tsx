"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowRight, Clock, Shuffle } from "lucide-react"

interface TransitionPhaseProps {
    onNext: () => void
}

export default function TransitionPhase({ onNext }: TransitionPhaseProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-indigo-500">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-indigo-600" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-gray-900">
                        Important Format Change
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-8 pt-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <p className="text-lg text-gray-700 font-medium text-center">
                            The upcoming tests are different from what you just completed.
                            Please read carefully:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
                                <Shuffle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-blue-900">Navigation Allowed</h4>
                                    <p className="text-sm text-blue-800 mt-1">
                                        You can now jump between any question in the test.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg flex items-start space-x-3">
                                <Clock className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-orange-900">Strict Time Limits</h4>
                                    <p className="text-sm text-orange-800 mt-1">
                                        These tests are significantly longer and have tight time constraints.
                                        Work efficiently!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                        <Button
                            size="lg"
                            onClick={onNext}
                            className="w-full md:w-auto min-w-[200px] text-lg h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
                        >
                            I Understand - Continue
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <p className="text-sm text-gray-500">
                            Click the button above when you are ready to start.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
