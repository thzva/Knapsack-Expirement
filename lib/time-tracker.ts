// Time tracking utility for questions and sections
export class TimeTracker {
  private startTime: Date | null = null
  private endTime: Date | null = null
  private participantId: string | null = null
  private sectionName: string | null = null
  private questionId: number | null = null
  private interactions: Array<{type: string, timestamp: Date, data?: any}> = []

  constructor(participantId?: string) {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      this.participantId = participantId || localStorage.getItem('participantId')
    } else {
      this.participantId = participantId || null
    }
  }

  // Start timing for a section
  startSection(sectionName: string) {
    this.sectionName = sectionName
    this.questionId = null
    this.startTime = new Date()
    this.endTime = null
    this.interactions = []
    
    console.log(`[TimeTracker] Started section: ${sectionName}`)
    
    // Log section start to backend
    this.logTimeData({
      sectionName,
      timeData: {
        startTime: this.startTime.toISOString()
      }
    })
  }

  // Start timing for a specific question
  startQuestion(questionId: number, sectionName?: string) {
    if (sectionName) this.sectionName = sectionName
    this.questionId = questionId
    this.startTime = new Date()
    this.endTime = null
    this.interactions = []
    
    console.log(`[TimeTracker] Started question ${questionId} in section ${this.sectionName}`)
  }

  // End timing and log to backend
  endQuestion() {
    if (!this.startTime || !this.questionId || !this.sectionName) {
      console.warn('[TimeTracker] Cannot end question - missing start time, question ID, or section')
      return
    }

    this.endTime = new Date()
    const timeSpent = this.endTime.getTime() - this.startTime.getTime()
    
    console.log(`[TimeTracker] Question ${this.questionId} completed in ${timeSpent}ms`)
    
    // Log question time to backend
    this.logTimeData({
      sectionName: this.sectionName,
      questionId: this.questionId,
      timeData: {
        startTime: this.startTime.toISOString(),
        endTime: this.endTime.toISOString(),
        timeSpent
      }
    })
  }

  // End section timing
  endSection() {
    if (!this.startTime || !this.sectionName) {
      console.warn('[TimeTracker] Cannot end section - missing start time or section name')
      return
    }

    this.endTime = new Date()
    const timeSpent = this.endTime.getTime() - this.startTime.getTime()
    
    console.log(`[TimeTracker] Section ${this.sectionName} completed in ${timeSpent}ms`)
    
    // Log section completion to backend
    this.logTimeData({
      sectionName: this.sectionName,
      timeData: {
        endTime: this.endTime.toISOString(),
        timeSpent
      }
    })
  }

  // Log interaction (answer change, focus, blur, etc.)
  logInteraction(type: string, data?: any) {
    const interaction = {
      type,
      timestamp: new Date(),
      data
    }
    
    this.interactions.push(interaction)
    
    // If we're tracking a question, log the interaction
    if (this.questionId && this.sectionName) {
      this.logTimeData({
        sectionName: this.sectionName,
        questionId: this.questionId,
        interactionType: type,
        timeData: {
          interactionData: data
        }
      })
    }
  }

  // Private method to send time data to backend
  private async logTimeData(payload: {
    sectionName?: string
    questionId?: number
    timeData: any
    interactionType?: string
  }) {
    // Skip if we're on the server side
    if (typeof window === 'undefined') return
    
    if (!this.participantId) {
      console.warn('[TimeTracker] No participant ID available for logging')
      return
    }

    try {
      const API_BASE = process.env.NODE_ENV === 'production' 
        ? (process.env.NEXT_PUBLIC_API_BASE || "https://knapsack-expirement-03kg.onrender.com")
        : "http://localhost:8787"

      const response = await fetch(`${API_BASE}/api/v1/log-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantId: this.participantId,
          ...payload
        })
      })

      if (!response.ok) {
        console.error('[TimeTracker] Failed to log time data:', response.status)
      }
    } catch (error) {
      console.error('[TimeTracker] Error logging time data:', error)
    }
  }

  // Get current timing info
  getCurrentTime() {
    if (!this.startTime) return null
    
    const now = new Date()
    return {
      startTime: this.startTime,
      currentTime: now,
      elapsed: now.getTime() - this.startTime.getTime(),
      sectionName: this.sectionName,
      questionId: this.questionId,
      interactionCount: this.interactions.length
    }
  }

  // Reset tracker
  reset() {
    this.startTime = null
    this.endTime = null
    this.sectionName = null
    this.questionId = null
    this.interactions = []
  }
}

// Global time tracker instance
export const timeTracker = new TimeTracker()

// Hook for React components
export const useTimeTracker = () => {
  return timeTracker
}
