import {
  GetFunctionCommand,
  LambdaClient
} from "@aws-sdk/client-lambda";
import axios from "axios";
import { extractLambdaNameFromArn } from "../utils/arnUtils.js";
import { saveFile } from "../utils/fileUtils.js";

export class LambdaService {
  constructor(private lambda: LambdaClient) {}

  async downloadLambdaCode(lambdaArn: string, outputDir: string) {
    const functionName = extractLambdaNameFromArn(lambdaArn);
    const { Code, Configuration } = await this.lambda.send(
      new GetFunctionCommand({ FunctionName: functionName })
    );
    const url = Code?.Location;
    if (!url) throw new Error("No code location found for " + functionName);

    const response = await axios.get(url, { responseType: "arraybuffer" });
    const filePath = saveFile(outputDir, `${functionName}.zip`, response.data);
    const envVariables = Configuration?.Environment?.Variables || {};
    // if (Object.keys(envVariables).length > 0) {
    //   const envFilePath = saveFile(outputDir, `${functionName}.env`, JSON.stringify(envVariables, null, 2));
    // }
    return {filePath, envVariables, functionName};
  }
}
