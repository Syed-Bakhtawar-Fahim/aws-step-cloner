import { SFNClient } from "@aws-sdk/client-sfn";

export const createSFNClient = (region: string, credentials: any) => {
  return new SFNClient({ region, credentials });
};
