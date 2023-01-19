# AI Query Machine

Simple application based on the "short-shot training" tutorial : `https://github.com/openai/openai-cookbook/blob/main/examples/Question_answering_using_embeddings.ipynb`

Currently this application just consumes data from the Lamden medium publication, but it can easily be modified to work with any medium pub.

### Get started.

* Ensure you have PM2 & Nodejs / npm installed on your machine.
* Create a file called `ecosystem.config.js` in project root
* Goto `beta.openai.com` and create an account, generate an API Key & populate the file you created above with the info.
```typescript
module.exports = {
	apps: [
		{
			name: "api",
			script: "cd ./api && npm run start",
			env: {
				OPENAI_API_KEY: "",
                OPENAI_ORG: "",
                RAPIDAPI_KEY: "" // only needed for syncing data from medium
			}
		},
	]
};
```
* Run `pm2 start ecosystem.config.js` from the project root.
* Interact with the application by navigating to localhost:3000/api/