#!/usr/bin/env node
/*
批量添加修改时间
用于 blog 初始化修改时间（支持子目录）
*/

const fs = require('fs').promises;
const path = require('path');

// 日期格式化函数（保持不变）
function getFormatDate(timeStr, dateSeparator, timeSeparator) {
  dateSeparator = dateSeparator || '-';
  timeSeparator = timeSeparator || ':';
  const date = new Date(timeStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const seconds = date.getSeconds();

  const pad = (n) => (n > 9 ? n : '0' + n);
  return `${year}${dateSeparator}${pad(month)}${dateSeparator}${pad(day)} ${pad(hour)}${timeSeparator}${pad(
    minute,
  )}${timeSeparator}${pad(seconds)}`;
}

// 正则表达式（建议简化，但先保留你的逻辑）
const UPDATED_REGEX = /updated:\s*\d{4}[-\/]\d{2}[-\/]\d{2}\s\d{2}:\d{2}:\d{2}\r?\n?/gi;

// 递归读取目录中所有 .md 文件
async function walk(dir) {
  let files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(await walk(fullPath)); // 递归子目录
    } else if (item.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// 处理单个文件
async function processFile(filePath) {
  try {
    console.log('正在处理文件：', filePath);
    const data = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);
    const mtime = getFormatDate(stats.mtime);

    // 先删除已有的 updated 行（更健壮的方式）
    let result = data.replace(UPDATED_REGEX, '');

    // 在 categories: 前插入 updated（若不存在，则尝试其他位置）
    if (result.includes('categories:')) {
      result = result.replace(/(categories:)/, `updated: ${mtime}\n$1`);
    } else if (result.includes('---\n')) {
      // 如果没有 categories，插入到 front-matter 末尾（第二个 --- 前）
      const parts = result.split(/(---\r?\n)/);
      if (parts.length >= 3) {
        parts[2] = `updated: ${mtime}\n${parts[2]}`;
        result = parts.join('');
      } else {
        // fallback：加到开头
        result = `---\nupdated: ${mtime}\n---\n${result}`;
      }
    } else {
      // 没有 front-matter，加到最前面
      result = `updated: ${mtime}\n\n${result}`;
    }

    await fs.writeFile(filePath, result, 'utf8');
  } catch (err) {
    console.error('处理文件出错：', filePath, err);
  }
}

// 主函数
async function main() {
  console.log('脚本开始运行...');
  const mdFiles = await walk('./'); // 从当前目录开始递归
  console.log(`共找到 ${mdFiles.length} 个 .md 文件`);

  for (const file of mdFiles) {
    await processFile(file);
  }

  console.log('运行完毕！');
}

// 启动
main().catch(console.error);
