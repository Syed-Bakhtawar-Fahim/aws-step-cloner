import { createSFNClient } from "../clients/sfnClient.js";
import { createLambdaClient } from "../clients/lambdaClient.js";
import { StepFunctionService } from "../services/stepFunctionService.js";
import { LambdaService } from "../services/lambdaService.js";

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

    for (const arn of lambdaArns) {
      const filePath = await lambdaService.downloadLambdaCode(arn, outputDir);
      console.log(`--- Downloaded: ${filePath}`);
    }

    console.log("--- All Lambda functions downloaded successfully!");
    return {
      definition,
      lambdaArns,
    };
  }
}
