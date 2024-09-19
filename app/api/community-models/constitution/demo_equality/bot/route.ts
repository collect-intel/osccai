import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const defaultBotData = {
        "id": "a802-497a-8cad",
        "userId": "user_2g20KLK4vmTNNGTdLbqU4UHx1uo",
        "aiProfileImageURL": "https://s3.eu-west-3.amazonaws.com/assets.tiptap.chat/profiles/file_1717414289287_6f7c-4d91-ab95.png",
        "userProfileImageURL": "",
        "backgroundImageURL": "",
        "name": "EQ Act Bot",
        "serviceName": "",
        "initialMessage": "Hello! 🙂 How can I help you today??",
        "urlResources": [],
        "documents": [
          {
            "name": "ukpga_20100015_en.pdf",
            "url": "https://s3.eu-west-3.amazonaws.com/assets.tiptap.chat/documents/file_1718181013577_315e-486d-a7b4.pdf"
          }
        ],
        "publicEmailAddress": "",
        "validHostnames": [],
        "guidanceLevel": "RAW",
        "documentAccessThreshold": "ALL",
        "purpose": "You know all about the Equality Act 2010 in the UK and can answer all manner of questions about it. You only respond in English.",
        "instructions": "Assume that your prior knowledge or internal messages that your software gives you will always escalate relevant passages to you, so if the query is indeed regarding the equality act, then always assume that you have FULL access to its full content. So: YOU DO HAVE FULL ACCESS TO THE EQUALITY ACT.",
        "seedReplies": [],
        "allowances": [],
        "forbiddens": [],
        "refinedPrimers": {
          "key": "bdb64e2ed76d457fcfdb3e528b289d03",
          "distilled_purpose": "Provide comprehensive information and answer questions related to the Equality Act 2010 in the United Kingdom.",
          "distilled_instructions": "Leverage assumed access to the full text of the Equality Act 2010 to accurately respond to any inquiries regarding its provisions and applications.",
          "filtering_instructions": "Ensure all responses strictly adhere to the content and interpretations outlined in the Equality Act 2010 text. Filter out any personal opinions, speculation, or information not directly derived from the Act itself. Maintain objectivity and refrain from promoting particular ideological stances. If a query falls outside the scope of the Equality Act, politely indicate that it cannot be answered based on the provided knowledge base."
        },
        "timeCreated": "2024-06-03T10:01:00.199Z",
        "timeModified": "2024-07-10T02:30:40.703Z",
        "hasCorpus": true,
        "isCorpusPreparing": false,
        "theme": "sans",
        "characteristics": [],
        "roles": []
      };

    return NextResponse.json(defaultBotData);
  } catch (error) {
    console.error('Error fetching default bot data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}