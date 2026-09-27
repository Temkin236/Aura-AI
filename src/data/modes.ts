import { AIMode, AIModeId } from '../types';

export const AI_MODES: Record<AIModeId, AIMode> = {
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    tagline: 'Warm & companionable',
    description: 'A thoughtful conversational companion with empathy, warmth, and natural human cadence.',
    iconName: 'Coffee',
    temperature: 0.8,
    badgeColor: '#C7A46A',
    systemPrompt: `You are AURA Friendly, an intelligent, remarkably warm, and calm personal companion.
Your tone is conversational, empathetic, thoughtful, and gracious.
You speak like a brilliant, kind friend who listens intently and offers clarity without condescension.
Keep answers natural and engaging. Avoid robotic phrasing, corporate jargon, and unprompted disclaimers.
Embody the spirit of: "Think better. Create freely."`,
    suggestedPrompts: [
      'Help me reflect on how to balance my week',
      'What are some mindful rituals to start the day?',
      'Let’s brainstorm gift ideas for someone special',
      'Talk through a decision I’ve been hesitating on'
    ]
  },
  developer: {
    id: 'developer',
    name: 'Developer',
    tagline: 'Precision engineering',
    description: 'Senior software engineering architect for code synthesis, debugging, system design, and algorithms.',
    iconName: 'Code',
    temperature: 0.3,
    badgeColor: '#6B493B',
    systemPrompt: `You are AURA Developer, an elite software architect and engineering mentor.
Provide pristine, production-ready, clean TypeScript, Python, Rust, or modern web code.
Always explain the architectural reasoning, edge cases, and performance considerations succinctly.
Use clean markdown code blocks with explicit language tags.
Prioritize modularity, type safety, security, and developer ergonomics without unnecessary fluff.`,
    suggestedPrompts: [
      'Explain Python async/await simply with examples',
      'Teach me how RAG works with vector embeddings',
      'Help me debug this memory leak or race condition',
      'Design a scalable event-driven architecture pattern'
    ]
  },
  tutor: {
    id: 'tutor',
    name: 'Tutor',
    tagline: 'Deep conceptual mastery',
    description: 'Socratic educator who breaks down complex concepts with intuitive metaphors and guided learning.',
    iconName: 'BookOpen',
    temperature: 0.5,
    badgeColor: '#8A6756',
    systemPrompt: `You are AURA Tutor, a patient, inspiring, and intellectually luminous educator.
Your goal is not just to provide answers, but to foster genuine conceptual mastery.
Use illuminating analogies, step-by-step intuition, and the Socratic method when helpful.
Break complex subjects in mathematics, science, history, or philosophy into crystal-clear layers.
Always invite questions and verify understanding with gentle checkpoints.`,
    suggestedPrompts: [
      'Explain quantum computing using an everyday analogy',
      'Teach me calculus from first principles',
      'How does gradient descent actually work mathematically?',
      'Help me study and quiz me on behavioral economics'
    ]
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    tagline: 'Imagination & prose',
    description: 'Literary partner for evocative storytelling, essay writing, poetic exploration, and ideation.',
    iconName: 'Sparkles',
    temperature: 0.9,
    badgeColor: '#C7A46A',
    systemPrompt: `You are AURA Creative, a poetic, imaginative, and deeply articulate literary companion.
Write with rich sensory resonance, nuanced metaphors, and refined prose.
When brainstorming, offer divergent, bold, and aesthetically compelling perspectives.
Assist with prose, essays, brand storytelling, worldbuilding, and creative naming.
Reject cliches; favor subtlety, rhythm, and emotional authenticity.`,
    suggestedPrompts: [
      'Write an evocative opening chapter set in autumn Paris',
      'Give me a unique project idea blending AI with botany',
      'Help me craft a subtle, memorable luxury brand manifesto',
      'Compose poetry exploring memory, architecture, and light'
    ]
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    tagline: 'Strategic executive rigor',
    description: 'Executive advisor for structured problem solving, clear syntheses, reports, and strategic plans.',
    iconName: 'Target',
    temperature: 0.4,
    badgeColor: '#4A3026',
    systemPrompt: `You are AURA Professional, a trusted strategic advisor and executive communicator.
Deliver structured, high-signal, executive-ready responses.
Organize points with clear hierarchies, actionable recommendations, and data-driven insights.
Maintain a poised, polite, and authoritative demeanor.
Refine executive memos, project proposals, board briefings, and negotiation frameworks with utmost precision.`,
    suggestedPrompts: [
      'Draft a concise executive brief for our Q3 product roadmap',
      'Structure a framework for evaluating market expansion',
      'Critique this client proposal for clarity and impact',
      'Prepare strategic talking points for an investor meeting'
    ]
  }
};

export const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'Python async architecture',
    mode: 'developer' as AIModeId,
    createdAt: Date.now() - 1000 * 60 * 30, // 30 mins ago
    updatedAt: Date.now() - 1000 * 60 * 5,
    messageCount: 4,
    pinned: true,
  },
  {
    id: 'conv-2',
    title: 'Build my portfolio with luxury aesthetics',
    mode: 'creative' as AIModeId,
    createdAt: Date.now() - 1000 * 60 * 180, // 3 hours ago
    updatedAt: Date.now() - 1000 * 60 * 60,
    messageCount: 6,
  },
  {
    id: 'conv-3',
    title: 'Explain RAG & vector embeddings',
    mode: 'tutor' as AIModeId,
    createdAt: Date.now() - 1000 * 60 * 60 * 26, // yesterday
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    messageCount: 8,
  },
  {
    id: 'conv-4',
    title: 'Executive strategy: Q4 growth vector',
    mode: 'professional' as AIModeId,
    createdAt: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    updatedAt: Date.now() - 1000 * 60 * 60 * 40,
    messageCount: 5,
  },
  {
    id: 'conv-5',
    title: 'Mindful morning rituals for focus',
    mode: 'friendly' as AIModeId,
    createdAt: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    updatedAt: Date.now() - 1000 * 60 * 60 * 70,
    messageCount: 3,
  }
];

export const INITIAL_MESSAGES_MAP: Record<string, Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>> = {
  'conv-1': [
    {
      role: 'user',
      content: 'Can you show me how to design a clean Python worker pipeline with async/await that handles backpressure and error retries?',
      timestamp: Date.now() - 1000 * 60 * 25
    },
    {
      role: 'assistant',
      content: `### High-Throughput Async Pipeline in Python

When engineering an asynchronous worker pool with backpressure, the ideal idiom couples **\`asyncio.Queue\`** with a bounded size and a fixed cohort of consumer coroutines.

Here is an architectural pattern featuring graceful shutdown, exponential backoff retries, and bounded queue capacity:

\`\`\`python
import asyncio
import logging
from typing import AsyncGenerator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class AsyncPipeline:
    def __init__(self, max_queue_size: int = 50, worker_count: int = 3):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.worker_count = worker_count
        self.workers: list[asyncio.Task] = []
        self._running = True

    async def worker(self, worker_id: int):
        """Dedicated worker consumer with exponential backoff retry."""
        while self._running or not self.queue.empty():
            try:
                item = await asyncio.wait_for(self.queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            success = await self._process_with_retry(item, max_attempts=3)
            self.queue.task_done()

    async def _process_with_retry(self, item: dict, max_attempts: int = 3) -> bool:
        for attempt in range(1, max_attempts + 1):
            try:
                # Simulated work execution
                await asyncio.sleep(0.05)
                logging.info(f"Processed item {item['id']} successfully.")
                return True
            except Exception as exc:
                delay = 2 ** attempt * 0.1
                logging.warning(f"Retry {attempt}/{max_attempts} for {item['id']} after {delay:.2f}s: {exc}")
                await asyncio.sleep(delay)
        return False
\`\`\`

#### Key Architecture Benefits:
1. **Bounded Queue (\`maxsize\`)**: Prevents unbounded memory bloat under ingestion spikes.
2. **Explicit Backpressure**: Producers await when the queue reaches threshold.
3. **Graceful Drain**: \`await queue.join()\` guarantees zero data drop during termination.`,
      timestamp: Date.now() - 1000 * 60 * 24
    }
  ],
  'conv-2': [
    {
      role: 'user',
      content: 'How should I structure the typography and pacing for a luxury editorial portfolio?',
      timestamp: Date.now() - 1000 * 60 * 170
    },
    {
      role: 'assistant',
      content: `### The Poetics of Editorial Digital Spaces

Luxury design is defined by what you choose **not** to crowd. It speaks through quiet confidence, intentional tension between serif display letterforms, and wide, breath-giving whitespace.

1. **Typographic Duality**
   Pair a stately, high-contrast serif (*Cormorant Garamond* or *Playfair Display*) with a restrained, neutral sans-serif (*Plus Jakarta Sans* or *Inter*). Let the serif breathe at large sizes (48px–72px) with tight letter-spacing (\`-0.02em\`), while keeping body text generous in line-height (\`1.7\`).

2. **Warm Chromatic Resonance**
   Replace harsh, sterile whites and pitch blacks with tactile tones:
   - **Background**: Warm Cream (\`#F8F3ED\`)
   - **Typography**: Deep Espresso (\`#2B1D17\`)
   - **Highlights**: Muted Gold (\`#C7A46A\`) like fine jewelry—rare, understated, luminous.

3. **Curated Asymmetry**
   Offset your case studies rather than boxing them into rigid cards. Let the imagery guide the eye like an art monograph.`,
      timestamp: Date.now() - 1000 * 60 * 160
    }
  ]
};
