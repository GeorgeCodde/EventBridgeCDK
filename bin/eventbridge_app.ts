#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as config from '../config.json';
import { EventbridgeAppStack } from '../lib/eventbridge_app-stack';

const app = new cdk.App();
new EventbridgeAppStack(app, 'EventbridgeAppStack', {
  env: config.environments.dev.env
});