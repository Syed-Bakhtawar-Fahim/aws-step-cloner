import {
  CreateFunctionCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";
import {
  CreateStateMachineCommand,
  SFNClient,
} from "@aws-sdk/client-sfn";
import fs from "fs";
import path from "path";

interface UploadLambdaOptions {
  zipPath: string;
  functionName: string;
  roleArn: string;
  region: string;
  lambdaExecutionRoleArn?: string;
}

interface UploadStepFunctionOptions {
  name: string;
  definition: string;
  roleArn: string;
}

export class UploadService {
  constructor(
    private lambdaClient: LambdaClient,
    private sfnClient: SFNClient
  ) {}

  async uploadLambda({
    zipPath,
    functionName,
    roleArn,
    region,
  }: UploadLambdaOptions) {
    const zipData = fs.readFileSync(zipPath);

    const command = new CreateFunctionCommand({
      FunctionName: functionName,
      Role: roleArn,
      Runtime: "nodejs18.x", 
      Handler: "index.handler",
      Code: { ZipFile: zipData },
      Description: "Cloned Lambda uploaded by step-cloner",
    });

    const result = await this.lambdaClient.send(command);
    console.log(`--- Created Lambda: ${result.FunctionName} in ${region}`);
    return result.FunctionArn;
  }

  async uploadStepFunction({
    name,
    definition,
    roleArn,
  }: UploadStepFunctionOptions) {
    const command = new CreateStateMachineCommand({
      name,
      definition,
      roleArn,
      type: "STANDARD",
    });

    const result = await this.sfnClient.send(command);
    console.log(`--- Created Step Function: ${result.stateMachineArn}`);
    return result.stateMachineArn ?? "";
  }
}
