import {  APIGatewayProxyEvent,APIGatewayEvent , APIGatewayProxyResult, Context } from "aws-lambda";
const eventHandler = require('eventHandler');
const dynamoHandler = require('dynamoHandler');

const EVENT_SOURCE = 'Order';
const EVENT_BUS  = process.env.EVENT_BUS;
const ORDER_TABLE = process.env.ORDER_TABLE;

interface eventYo extends APIGatewayEvent {
    pathParameters: {
        action: string,
        customerId: string,
        what: string
    }
}   



const handler = async (event: eventYo, context: Context): Promise<APIGatewayProxyResult> => {
    let result: any;

    const method = event.requestContext.httpMethod;
    const action = event.pathParameters.action;
    const customerId = event.pathParameters.customerId;
    const what = event.pathParameters.what;
    
    switch (method) {
        case 'GET':
            switch (action) {
                case 'create':
                    result = await createOrder(customerId, what);
                    break;
                default:
                    return {
                        statusCode: 501,
                        body: `Action '${action}' not implemented.`
                    }
            }
    }

    const response: APIGatewayProxyResult = {
        statusCode: result.length > 0 ? 200 : 404,
        body: result.length > 0? JSON.stringify(result[0]) : "Not Found"
    }
  return response
}
export { handler }

const createOrder = async(customerId: string, storeId: string)=> {
    console.log('create order')
    
    const orderId = new Date().toISOString();
    const order = {
        customerId,
        orderId,
        storeId
    };

    await eventHandler.sendEvent("OrderCreated", order, EVENT_BUS, EVENT_SOURCE);
    switch (storeId) {
        case 'soriana':
            await eventHandler.sendEvent("SorianaOrder", order, EVENT_BUS, EVENT_SOURCE);
            console.log('event SorianaOrder sent')
            break;
        case 'walmart':
            await eventHandler.sendEvent("WalmartOrder", order, EVENT_BUS, EVENT_SOURCE);
            console.log('event WalmartOrder sent')
            break;
        case 'lacomer':
            await eventHandler.sendEvent("LacomerOrder", order, EVENT_BUS, EVENT_SOURCE);
            console.log('event La Comer Order sent')
            break;
        default:
            break;
    }
    console.log('event sent')
    return [order];
}



