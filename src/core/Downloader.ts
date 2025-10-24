import { createSFNClient } from "../clients/sfnClient.js";
import { createLambdaClient } from "../clients/lambdaClient.js";
import { StepFunctionService } from "../services/stepFunctionService.js";
import { LambdaService } from "../services/lambdaService.js";
import fs from "fs";
import path from "path";

interface DownloadOptions {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  stateMachineArn: string;
  outputDir?: string;
}

export class Downloader {
  async download(options: DownloadOptions) {
    const {
      accessKeyId,
      secretAccessKey,
      region,
      stateMachineArn,
      outputDir = "./downloaded-lambdas",
    } = options;

    const credentials = { accessKeyId, secretAccessKey };

    const sfnClient = createSFNClient(region, credentials);
    const lambdaClient = createLambdaClient(region, credentials);

    const stepFnService = new StepFunctionService(sfnClient);
    const lambdaService = new LambdaService(lambdaClient);

    const definition =
      await stepFnService.getStateMachineDefinition(stateMachineArn);
    const lambdaArns = stepFnService.extractLambdaArns(definition);

    console.log("--- Found Lambdas:", lambdaArns);
    const allEnv: Record<string, Record<string, string>> = {};
    // for (const arn of lambdaArns) {
    //   const filePath = await lambdaService.downloadLambdaCode(arn, outputDir);
    //   console.log(`--- Downloaded: ${filePath}`);
    //   allEnv[functionName] = envVars;
    // }
    for (const arn of lambdaArns) {
      const { filePath, functionName, envVariables } =
        await lambdaService.downloadLambdaCode(arn, outputDir);
      console.log(`--- Downloaded: ${filePath}`);
      allEnv[functionName] = envVariables;
    }

    const envFilePath = path.join(outputDir, "lambda-envs.json");
    fs.writeFileSync(envFilePath, JSON.stringify(allEnv, null, 2), "utf-8");
    console.log(`--- Environment variables saved to ${envFilePath}`);

    console.log("--- All Lambda functions downloaded successfully!");
    return {
      definition,
      lambdaArns,
      envFilePath
    };
  }
}
