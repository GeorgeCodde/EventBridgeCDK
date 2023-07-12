import {  APIGatewayProxyEvent } from 'aws-lambda';
const { PublishCommand } = require('@aws-sdk/client-sns');
const { SNSClient } = require("@aws-sdk/client-sns");

const snsClient = new SNSClient({ region: 'us-east-1' });


const handler = async (event: APIGatewayProxyEvent)  => {
  
    const date = new Date();
	const text = `Mensaje enviado a las ${date.toString()} del servicio de La Comercial Mexicana`;
	console.log(text);

	const params = {
		Message: text,
		TopicArn: process.env.TOPIC_ARN,
	};

	const result = await snsClient.send(new PublishCommand(params));
	console.log(result);

}
export { handler }