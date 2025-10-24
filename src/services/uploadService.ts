// import {
//   CreateFunctionCommand,
//   GetFunctionCommand,
//   LambdaClient,
// } from "@aws-sdk/client-lambda";
// import { CreateStateMachineCommand, SFNClient } from "@aws-sdk/client-sfn";
// import fs from "fs";
// import path from "path";

// interface UploadLambdaOptions {
//   zipPath: string;
//   functionName: string;
//   roleArn: string;
//   region: string;
//   lambdaExecutionRoleArn?: string;
//   environmentVariables?: Record<string, string>;
//   envIncluded?: boolean;
//   envFilePath?: string;
// }

// interface UploadStepFunctionOptions {
//   name: string;
//   definition: string;
//   roleArn: string;
// }

// export class UploadService {
//   constructor(
//     private lambdaClient: LambdaClient,
//     private sfnClient: SFNClient
//   ) {}

//   async uploadLambda({
//     zipPath,
//     functionName,
//     roleArn,
//     region,
//     environmentVariables = {},
//     envIncluded = true,
//     envFilePath,
//   }: UploadLambdaOptions) {
//     const zipData = fs.readFileSync(zipPath);

//     if (envFilePath) {
//       // Developer provides a JSON file → use only that
//       environmentVariables =
//         JSON.parse(fs.readFileSync(envFilePath, "utf-8"))[functionName] || {};
//     } else if (envIncluded) {
//       // Fetch existing Lambda environment from AWS
//       environmentVariables = {... environmentVariables};
//     }
//     const command = new CreateFunctionCommand({
//       FunctionName: functionName,
//       Role: roleArn,
//       Runtime: "nodejs18.x",
//       Handler: "index.handler",
//       Code: { ZipFile: zipData },
//       Description: "Cloned Lambda uploaded by step-cloner",
//       Environment: { Variables: environmentVariables },
//     });

//     const result = await this.lambdaClient.send(command);
//     console.log(`--- Created Lambda: ${result.FunctionName} in ${region}`);
//     return result.FunctionArn;
//   }

//   async uploadStepFunction({
//     name,
//     definition,
//     roleArn,
//   }: UploadStepFunctionOptions) {
//     const command = new CreateStateMachineCommand({
//       name,
//       definition,
//       roleArn,
//       type: "STANDARD",
//     });

//     const result = await this.sfnClient.send(command);
//     console.log(`--- Created Step Function: ${result.stateMachineArn}`);
//     return result.stateMachineArn ?? "";
//   }

//   async getLambdaEnv(functionName: string): Promise<Record<string, string>> {
//     try {
//       const { Configuration } = await this.lambdaClient.send(
//         new GetFunctionCommand({ FunctionName: functionName })
//       );

//       return Configuration?.Environment?.Variables || {};
//     } catch (err) {
//       console.warn(
//         `--- Could not fetch environment for ${functionName}: ${err}`
//       );
//       return {};
//     }
//   }
// }

import { CreateFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { CreateStateMachineCommand, SFNClient } from "@aws-sdk/client-sfn";
import fs from "fs";

interface UploadLambdaOptions {
  zipPath: string;
  functionName: string;
  roleArn: string;
  region: string;
  lambdaExecutionRoleArn?: string;
  environmentVariables?: Record<string, string>;
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
    environmentVariables = {},
  }: UploadLambdaOptions) {
    const zipData = fs.readFileSync(zipPath);
    

    const command = new CreateFunctionCommand({
      FunctionName: functionName,
      Role: roleArn,
      Runtime: "nodejs18.x",
      Handler: "index.handler",
      Code: { ZipFile: zipData },
      Description: "Cloned Lambda uploaded by step-cloner",
      Environment: { Variables: environmentVariables },
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
