import fs from "fs";
import path from "path";

export const saveFile = (folder: string, fileName: string, data: Buffer) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  const filePath = path.join(folder, fileName);
  fs.writeFileSync(filePath, data);
  return filePath;
};
