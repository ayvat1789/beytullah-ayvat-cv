const CV_PROFILE = {
  fullName: 'Beytullah Ayvat',
  headline: 'Management Information Systems (MIS) Student at Boğaziçi University',
  location: 'Istanbul, Turkey',
  summary:
    'Undergraduate Management Information Systems student at Boğaziçi University (Class of 2024 entry) combining analytical thinking and Python programming with a deep appreciation for literature, music, and visual arts. Interested in building human-centered digital products, data-driven solutions, and AI-assisted web applications.',
  education: [
    {
      institution: 'Boğaziçi University',
      degree: 'B.S. in Management Information Systems (Yönetim Bilişim Sistemleri)',
      period: '2024 – Present',
      location: 'Istanbul, Turkey',
      highlights: [
        'Interdisciplinary curriculum bridging software development, data management, business strategy, and information systems.',
        'Active focus on Python programming, algorithmic problem solving, and modern AI workflows.'
      ]
    }
  ],
  skills: {
    programming: ['Python', 'HTML & CSS (Web Fundamentals)', 'Git & GitHub', 'AI-Assisted Development'],
    businessAndAnalytical: [
      'Management Information Systems',
      'Analytical & Critical Thinking',
      'Problem Solving',
      'Research & Technical Writing',
      'Project Planning'
    ],
    languages: [
      { name: 'Turkish', level: 'Native' },
      { name: 'English', level: 'B2+ (Upper-Intermediate — Academic & Professional Proficiency)' }
    ]
  },
  projects: [
    {
      title: 'Interactive CV Website & AI Chatbot',
      period: '2026',
      tech: ['Node.js', 'Express', 'HTML/CSS/JS', 'LLM API', 'Render'],
      description:
        'Designed and deployed a personal resume web application featuring a secure backend proxy and an integrated AI assistant that answers visitor questions about Beytullah Ayvat in English and Turkish.'
    },
    {
      title: 'Python Problem-Solving & Automation Exercises',
      period: '2024 – Present',
      tech: ['Python', 'Algorithms', 'Data Structures'],
      description:
        'Developing clean, modular Python scripts for algorithmic problem solving, text processing, and structured data analysis as part of Management Information Systems studies.'
    }
  ],
  interests: [
    {
      name: 'Literature (Edebiyat)',
      detail: 'Reading classic and contemporary literature, exploring storytelling, narrative structure, and critical essays.'
    },
    {
      name: 'Music (Müzik)',
      detail: 'Listening to and exploring diverse musical genres, composition aesthetics, and cultural context.'
    },
    {
      name: 'Visual Arts (Görsel Sanatlar)',
      detail: 'Appreciation of visual composition, design, cinema, photography, and contemporary art — inspiring a strong aesthetic sense in digital interfaces.'
    }
  ],
  contact: {
    location: 'Istanbul, Turkey',
    availability: 'Open to internships, student collaborations, and technology/MIS projects.'
  }
};

function buildSystemPrompt() {
  return `You are the personal AI CV Assistant on Beytullah Ayvat's portfolio and resume website.

Your job is to answer visitors' questions about Beytullah Ayvat clearly, warmly, professionally, and concisely.

STRICT RULES:
1. Reply in the SAME language the user writes in (if they ask in Turkish, reply in natural Turkish; if they ask in English, reply in natural English).
2. Base your answers strictly on the CV profile provided below. Never invent fake jobs, fake GPA numbers, fake phone numbers, fake email addresses, or fake certifications.
3. If someone asks for information not included in the CV (such as a phone number, exact GPA, or specific past employer), politely say that this detail isn't listed on the CV yet and suggest reaching out to Beytullah directly via the Contact section.
4. Keep responses concise (2–4 sentences or short bullet points unless the user asks for more detail).
5. Highlight the unique combination of Beytullah's analytical/technical background (Boğaziçi University MIS, Python, B2+ English) and his creative interests (literature, music, visual arts) when relevant.

CV PROFILE (JSON):
${JSON.stringify(CV_PROFILE, null, 2)}`;
}

module.exports = { CV_PROFILE, buildSystemPrompt };
