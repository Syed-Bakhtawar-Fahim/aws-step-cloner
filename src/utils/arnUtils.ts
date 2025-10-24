export const extractLambdaNameFromArn = (arn: string): string => {
  return arn.split(":").pop()!;
};
