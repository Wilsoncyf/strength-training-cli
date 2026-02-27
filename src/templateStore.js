import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const TEMPLATE_FILE = join(DATA_DIR, 'templates.json');
const INITIAL_DATA = { templates: [] };

async function readTemplates() {
  try {
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
    if (!existsSync(TEMPLATE_FILE)) {
      await writeFile(TEMPLATE_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      return INITIAL_DATA;
    }
    const raw = await readFile(TEMPLATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`读取模板失败: ${err.message}`);
  }
}

async function writeTemplates(data) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TEMPLATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 保存训练为模板
 * @param {string} name - 模板名称
 * @param {Array} exercises - 动作列表 [{name, weight, sets, reps, note}]
 * @returns {Promise<Object>} 创建的模板
 */
export async function saveTemplate(name, exercises) {
  if (!name?.trim()) throw new Error('模板名称不能为空');
  if (!exercises?.length) throw new Error('模板至少需要一个动作');

  const data = await readTemplates();
  const template = {
    id: nanoid(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    exercises: exercises.map(({ name, weight, sets, reps, note }) => ({
      name, weight, sets, reps, note: note || '',
    })),
  };
  data.templates.push(template);
  await writeTemplates(data);
  return template;
}

/**
 * 获取所有模板（摘要）
 */
export async function getTemplates() {
  const data = await readTemplates();
  return data.templates.map(({ exercises, ...t }) => ({
    ...t,
    exerciseCount: exercises.length,
    exercises, // 保留 exercises 以便加载时使用
  }));
}

/**
 * 获取单个模板（含完整动作列表）
 */
export async function getTemplate(id) {
  const data = await readTemplates();
  return data.templates.find(t => t.id === id) ?? null;
}

/**
 * 删除模板
 */
export async function deleteTemplate(id) {
  const data = await readTemplates();
  const before = data.templates.length;
  data.templates = data.templates.filter(t => t.id !== id);
  if (data.templates.length === before) return false;
  await writeTemplates(data);
  return true;
}
