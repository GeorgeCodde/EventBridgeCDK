import { Stack, StackProps, Aws, CfnOutput } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table} from 'aws-cdk-lib/aws-dynamodb';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions"
import * as config from '../config.json'



export class EventbridgeAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //SNS 

    const snsTopic = new Topic(this, 'SNSTopic', {
			displayName: 'Lambda subscription topic',
    });
    snsTopic.addSubscription(new EmailSubscription( 
      config.environments.dev.emailSub
    ))

    // Layers

    const HelpersLayer = new LayerVersion(this, 'HelpersLayer', {
      layerVersionName: 'CDK-Events-Advanced-Helpers',
      description: 'Helper functions for CDK Events Advanced',
      license: 'MIT',
      code: Code.fromAsset(join(__dirname, '..', 'layers', 'helpers')) ,
      compatibleRuntimes: [Runtime.NODEJS_18_X]
    
    })
    //Create a new EventBridge Bus
    const appEventBus = new EventBus(this, 'AppEventBus', {
      eventBusName: `AppEventBus-${Aws.STACK_NAME}`  
    })


    //Table store events
    const eventStoreTable = new Table(this, 'EventStoreTable', {
      partitionKey: {
        name: 'who',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timeWhat',
        type: AttributeType.STRING
      }
    })

    const eventStoreFuntion = new NodejsFunction(this, 'EventStoreFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: (join(__dirname, '..', 'services', 'eventstore', 'handler.ts')),
      bundling: {
        externalModules: ['aws-sdk', '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb']
      },
      layers: [HelpersLayer],
      environment: {
        EVENT_STORE_TABLE: eventStoreTable.tableName,
      }
    })

    const storeEventRule = new Rule(this, 'SoreEventRule', {
      eventBus: appEventBus,
      eventPattern: {
        source: [{prefix: ""}] as any[]
      }
    })
    
    storeEventRule.addTarget(new targets.LambdaFunction(eventStoreFuntion))
    eventStoreTable.grantFullAccess(eventStoreFuntion);

    // EventBridge Permissions
    const eventBridgePutPilicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [appEventBus.eventBusArn],
      actions: ['events:PutEvents']
    })

    //Order Microservice

    const orderTble = new Table(this, 'OrderTable', {
      partitionKey: {
        name: 'customerId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'orderId',
        type: AttributeType.STRING
      
      }
    })
    
    const orderFuntion = new NodejsFunction(this, 'OrderFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: (join(__dirname, '..', 'services', 'order', 'handler.ts')),
      bundling: {
        externalModules: ['aws-sdk','eventHandler','dynamoHandler']
      },
      layers: [HelpersLayer],
      environment: {
        ORDER_TABLE: orderTble.tableName,
        EVENT_BUS: appEventBus.eventBusName
      }
    })
    
    orderTble.grantFullAccess(orderFuntion);
    orderFuntion.addToRolePolicy(eventBridgePutPilicy);
    

    // Soriana Microservice
 
    const sorianaFuntion = new NodejsFunction(this, 'SorianaFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: (join(__dirname, '..', 'services', 'soriana', 'handler.ts')),
      bundling: {
        externalModules: ['aws-sdk', '@aws-sdk/client-sns']
      },
      environment: {
        TOPIC_ARN: snsTopic.topicArn,
        EVENT_BUS: appEventBus.eventBusName
      }
    })

    sorianaFuntion.addToRolePolicy(eventBridgePutPilicy);
    snsTopic.grantPublish(sorianaFuntion);
    
    const sorianaEventRule = new Rule(this, 'SorianaEventRule', {
      eventBus: appEventBus,
      eventPattern: {
        detailType: [
          'SorianaOrder'
        ]
      }
    })

    sorianaEventRule.addTarget(new targets.LambdaFunction(sorianaFuntion))

    // Walmart Microservice

    const walmartFuntion = new NodejsFunction(this, 'WalmartFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: (join(__dirname, '..', 'services', 'walmart', 'handler.ts')),
      bundling: {
        externalModules: ['aws-sdk', '@aws-sdk/client-sns']
      },
      environment: {
        TOPIC_ARN: snsTopic.topicArn,
        EVENT_BUS: appEventBus.eventBusName
      }
    })

    walmartFuntion.addToRolePolicy(eventBridgePutPilicy);
    snsTopic.grantPublish(walmartFuntion);
    
    const walmartEventRule = new Rule(this, 'WalmartEventRule', {
      eventBus: appEventBus,
      eventPattern: {
        detailType: [
          'WalmartOrder'
        ]
      }
    })

    walmartEventRule.addTarget(new targets.LambdaFunction(walmartFuntion))

    // La comer Microservicio
    const lacomerFuntion = new NodejsFunction(this, 'LaComerFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: (join(__dirname, '..', 'services', 'lacomer', 'handler.ts')),
      bundling: {
        externalModules: ['aws-sdk', '@aws-sdk/client-sns']
      },
      environment: {
        TOPIC_ARN: snsTopic.topicArn,
        EVENT_BUS: appEventBus.eventBusName
      }
    })

    lacomerFuntion.addToRolePolicy(eventBridgePutPilicy);
    snsTopic.grantPublish(lacomerFuntion);
    
    const lacomerEventRule = new Rule(this, 'LaComerEventRule', {
      eventBus: appEventBus,
      eventPattern: {
        detailType: [
          'LacomerOrder'
        ]
      }
    })

    lacomerEventRule.addTarget(new targets.LambdaFunction(lacomerFuntion))


    // Create the API Gateway to Order

    const orderAPI = new RestApi(this, 'OrderAPI');
    orderAPI.root.resourceForPath("/order/{action}/{customerId}/{what}")
      .addMethod('GET', new LambdaIntegration(orderFuntion))
    
    
    //Outputs

    new CfnOutput(this, "OrderTableOutput", {
      value: orderTble.tableName
    });

  }
}
