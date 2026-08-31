"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shuffle, ArrowRight, Layers, LayoutList } from "lucide-react"

interface RandomizedInstructionsPhaseProps {
    onNext: () => void
}

export default function RandomizedInstructionsPhase({ onNext }: RandomizedInstructionsPhaseProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-indigo-500">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <Shuffle className="h-8 w-8 text-indigo-600" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-gray-900">
                        Randomized Test Format
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-8 pt-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <p className="text-lg text-gray-700 font-medium text-center">
                            The following tests have a specific randomized structure. Here is how they are built:
                        </p>

                        <div className="grid gap-4 mt-4">
                            <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3">
                                <LayoutList className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-blue-900">30 Questions Total</h4>
                                    <p className="text-sm text-blue-800 mt-1">
                                        Each test consists of exactly 30 questions.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg flex items-start space-x-3">
                                <Layers className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-purple-900">Equal Difficulty Distribution</h4>
                                    <p className="text-sm text-purple-800 mt-1">
                                        Out of those 30 questions, there will always be exactly:
                                    </p>
                                    <ul className="list-disc ml-5 mt-2 text-sm text-purple-800 space-y-1">
                                        <li><strong>10 Easy</strong> questions</li>
                                        <li><strong>10 Medium</strong> questions</li>
                                        <li><strong>10 Hard</strong> questions</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg flex items-start space-x-3">
                                <Shuffle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-orange-900">Fully Randomized Order</h4>
                                    <p className="text-sm text-orange-800 mt-1">
                                        Each question has an equal probability of appearing in any position within the test. They are not grouped by difficulty.
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
                            Continue to Test
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
