import { APIGatewayProxyEvent , EventBridgeEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument, ExecuteStatementCommand } = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDB();
const ddbDocClient = DynamoDBDocument.from(ddbClient);

const STORE_TABLE = process.env.EVENT_STORE_TABLE;


const handler = async (event: any) => {

    console.log(JSON.stringify(event, null, 2));
    await storeEvent(event);

}
export { handler }

const storeEvent = async(event: any)=> {

    const currentTime = new Date().toISOString(); // event.time is express in seconds and not ms, not enough precision

    const who = 'C#' + event.detail.customerId; // C# for customers, P# for products, ...
    const timeWhat = currentTime + '#' + event['detail-type'];
    const eventDetail = JSON.stringify(event.detail);
    
    const dbEvent = `{'who' : '${who}', 'timeWhat' : '${timeWhat}',
    'eventSource' : '${event.source}', 'eventDetail' : '${eventDetail}'}`;
    const params = {
        Statement: `INSERT INTO "${STORE_TABLE}" VALUE ${dbEvent}`
    }

    console.log(params);

    try {
        const { Items } = await ddbDocClient.send(new ExecuteStatementCommand(params));
        return Items;
    } catch (err) {
        console.error(err);
    }

    return;
}