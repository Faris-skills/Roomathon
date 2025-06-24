const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

export const compareImagesWithAI = async (
  referenceImages = [],
  comparisonImages = []
) => {
  if (!apiKey) {
    throw new Error("OpenAI API key is missing.");
  }

  if (!Array.isArray(referenceImages) || !Array.isArray(comparisonImages)) {
    throw new Error("Image inputs must be arrays.");
  }

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `You are an AI assistant specialized in property inspection, comparing "Before" and "After" images of a rental room to identify significant changes.

You are an expert at analyzing images and finding differences between them. 
You will be given two images: a reference image and a comparison image. 
Your task is to identify all the differences between these images and provide a detailed description of each difference.
Focus on just Missing or added objects

Format your response as a list of differences, with each difference clearly described.
Be specific and detailed in your descriptions, mentioning the exact location and nature of each difference.

**Instructions for your response:**
- Be objective, factual, and concise. Do not speculate or invent details.
- List minor changes as well, provided it is a real identifiyable change.
- Do not end in conversation-like manner with “Would you like…” etc.
---
BEFORE IMAGES:`,
        },
        ...referenceImages.map((url) => ({
          type: "image_url",
          image_url: { url, detail: "high" },
        })),
        {
          type: "text",
          text: "\nAFTER IMAGES:",
        },
        ...comparisonImages.map((url) => ({
          type: "image_url",
          image_url: { url, detail: "high" },
        })),
      ],
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      max_tokens: 1500,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI error:", data);
    throw new Error(data.error?.message || "OpenAI API request failed");
  }

  return data.choices?.[0]?.message?.content || "";
};
