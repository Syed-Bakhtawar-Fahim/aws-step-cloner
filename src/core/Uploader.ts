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
  stepFunctionDefinitionPath: string | object;
  roleArn: string;
  lambdaExecutionRoleArn: string;
  lambdaDir: string;
  prefix?: string;
  envFilePath?: string;  // JSON file with envs per lambda
  envIncluded?: boolean; // use downloaded env
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
      lambdaExecutionRoleArn,
      lambdaDir,
      prefix = "",
      envFilePath,
      envIncluded = false,
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
      prefix,
      lambdaExecutionRoleArn,
      envFilePath,
      envIncluded
    );

    if (!arnMap || Object.keys(arnMap).length === 0) {
      throw new Error(`--- ** --- Failed to upload Lambda(s)`);
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

    console.log("---- Clone completed →", newStepArn);
    return newStepArn;
  }

  private async uploadAllLambdas(
    uploadService: UploadService,
    lambdaDir: string,
    roleArn: string,
    region: string,
    prefix: string,
    lambdaExecutionRoleArn: string,
    envFilePath?: string,
    envIncluded?: boolean
  ): Promise<Record<string, string>> {
    // Load env JSON if provided
    let envMap: Record<string, Record<string, string>> = {};
    if (envFilePath) {
      envMap = JSON.parse(fs.readFileSync(envFilePath, "utf-8"));
    }

    const lambdaFiles = fs
      .readdirSync(lambdaDir)
      .filter((f) => f.endsWith(".zip"));

    const arnMap: Record<string, string> = {};

    for (const file of lambdaFiles) {
      const baseName = path.basename(file, ".zip") as string; // strict
      const newName = `${prefix}${baseName}`;
      const zipPath = path.join(lambdaDir, file);

      // Decide environment variables
      let environmentVariables: Record<string, string> = {};
      if (envFilePath) {
        environmentVariables = envMap[baseName];
      } else if (envIncluded) {
        // Use the downloaded env for this lambda
        const downloadedEnvPath = path.join(lambdaDir, "lambda-envs.json");
        if (fs.existsSync(downloadedEnvPath)) {
          const downloadedEnv = JSON.parse(fs.readFileSync(downloadedEnvPath, "utf-8"));
          environmentVariables = downloadedEnv[baseName] || {};
        }
      }

      environmentVariables = Object.fromEntries(
        Object.entries(environmentVariables).map(([k, v]) => [k, String(v)])
      );

      const arn = await uploadService.uploadLambda({
        zipPath,
        functionName: newName,
        roleArn: lambdaExecutionRoleArn || roleArn,
        region,
        environmentVariables,
      });

      if (!arn) {
        throw new Error(`--- ** --- Failed to upload Lambda: ${newName}`);
      }

      arnMap[baseName] = arn;
    }

    return arnMap;
  }

  private updateStepFunctionDefinition(
    definition: string | object,
    arnMap: Record<string, string>
  ): string {
    const parsed: StepFunctionDefinition =
      typeof definition === "string"
        ? JSON.parse(fs.readFileSync(definition, "utf-8"))
        : definition;

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
