import MistralClient from "./mistral";

const client = new MistralClient();

client.listModels().then((modelList) => {
  console.log(JSON.stringify(modelList, null, 2));
});

// client.embeddings({
//   model: "mistral-embed",
//   input: [
//     "What is the meaning of life?",
//     "What is the meaning of death?",
//   ],
// }).then((response) => {
//   console.log(JSON.stringify(response, null, 2));
// });

// client.chat({
//   model: "mistral-tiny",
//   messages: [
//     {
//       role: 'user',
//       content: 'What is the meaning of life?',
//     },
//   ],
// }).then((response) => {
//   console.log(JSON.stringify(response, null, 2));
// });

function chatStream(prompt: string) {
  client.chatStream({
    model: "mistral-medium",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  }).then(async (responseGenerator) => {
    let currentIndex = 0;
    for await (const response of responseGenerator) {
      if (response.choices[0].index === currentIndex) {
        console.write(response.choices[0].delta?.content || "");
      } else {
        await console.write("\n");
      }
    }
    console.write("\n");
  });
}

// const prompt = Bun.argv.slice(2).join(" ");

// if (prompt) {
//   console.log(`Prompt:\n${prompt}\n\nResponse:`);
//   chatStream(
//     prompt,
//   );
// }
