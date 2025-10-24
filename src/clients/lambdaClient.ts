import { LambdaClient } from "@aws-sdk/client-lambda";

export const createLambdaClient = (region: string, credentials: any) => {
  return new LambdaClient({ region, credentials });
};
