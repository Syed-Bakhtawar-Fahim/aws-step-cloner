import { createLambdaClient } from "../clients/lambdaClient.js";
import { createSFNClient } from "../clients/sfnClient.js";
import { UploadService } from "../services/uploadService.js";
import fs from "fs";
import path from "path";

interface UploadOptions {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  stepFunctionName: string;
  stepFunctionDefinitionPath: string;
  roleArn: string;
  lambdaDir: string;
  prefix?: string;
}

interface StepFunctionState {
  Type: string;
  Resource?: string;
  [key: string]: any;
}

interface StepFunctionDefinition {
  States: Record<string, StepFunctionState>;
}

export class Uploader {
  async upload(options: UploadOptions): Promise<string> {
    const {
      accessKeyId,
      secretAccessKey,
      region,
      stepFunctionName,
      stepFunctionDefinitionPath,
      roleArn,
      lambdaDir,
      prefix = "",
    } = options;

    const credentials = { accessKeyId, secretAccessKey };
    const sfnClient = createSFNClient(region, credentials);
    const lambdaClient = createLambdaClient(region, credentials);
    const uploadService = new UploadService(lambdaClient, sfnClient);

    const arnMap = await this.uploadAllLambdas(
      uploadService,
      lambdaDir,
      roleArn,
      region,
      prefix
    );

    if (!arnMap) {
      throw new Error(`❌ Failed to upload Lambda: ${prefix}${stepFunctionName}`);
    }

    const newDefinition = this.updateStepFunctionDefinition(
      stepFunctionDefinitionPath,
      arnMap
    );

    const newStepArn = await uploadService.uploadStepFunction({
      name: `${prefix}${stepFunctionName}`,
      definition: newDefinition,
      roleArn,
    });

    console.log("🎉 Clone completed →", newStepArn);
    return newStepArn;
  }

  private async uploadAllLambdas(
    uploadService: UploadService,
    lambdaDir: string,
    roleArn: string,
    region: string,
    prefix: string
  ): Promise<Record<string, string>> {
    const lambdaFiles = fs
      .readdirSync(lambdaDir)
      .filter((f) => f.endsWith(".zip"));
    const arnMap: Record<string, string> = {};

    for (const file of lambdaFiles) {
      const baseName = path.basename(file, ".zip");
      const newName = `${prefix}${baseName}`;
      const zipPath = path.join(lambdaDir, file);

      const arn = await uploadService.uploadLambda({
        zipPath,
        functionName: newName,
        roleArn,
        region,
      });

      if(!arn) {
        throw new Error(`❌ Failed to upload Lambda: ${newName}`);
      }

      arnMap[baseName] = arn;
    }

    return arnMap;
  }

  private updateStepFunctionDefinition(
    definitionPath: string,
    arnMap: Record<string, string>
  ): string {
    const definitionContent = fs.readFileSync(definitionPath, "utf-8");
    const parsed: StepFunctionDefinition = JSON.parse(definitionContent);

    for (const state of Object.values(parsed.States)) {
      if (state.Type === "Task" && state.Resource?.includes("lambda")) {
        const oldName = state.Resource.split(":").pop();
        if (oldName && arnMap[oldName]) {
          state.Resource = arnMap[oldName];
        }
      }
    }

    return JSON.stringify(parsed, null, 2);
  }
}
