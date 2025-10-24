import {
  DescribeStateMachineCommand,
  SFNClient
} from "@aws-sdk/client-sfn";

export class StepFunctionService {
  constructor(private sfn: SFNClient) {}

  async getStateMachineDefinition(arn: string) {
    const { definition } = await this.sfn.send(
      new DescribeStateMachineCommand({ stateMachineArn: arn })
    );
    return JSON.parse(definition!);
  }

  extractLambdaArns(definition: any): string[] {
    return Object.values(definition.States)
      .filter((s: any) => s.Type === "Task" && s.Resource.includes("lambda"))
      .map((s: any) => s.Resource);
  }
}
