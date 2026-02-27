import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const DATA_FILE = join(DATA_DIR, 'workouts.json');

const INITIAL_DATA = { workouts: [] };

// ── 内部辅助函数 ────────────────────────────────────────────────────────────

/**
 * 读取 JSON 数据文件，若文件不存在则自动初始化
 * @returns {Promise<{ workouts: Array }>}
 */
async function readData() {
  try {
    // 确保 data 目录存在
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    if (!existsSync(DATA_FILE)) {
      await writeData(INITIAL_DATA);
      return INITIAL_DATA;
    }

    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeData(INITIAL_DATA);
      return INITIAL_DATA;
    }
    throw new Error(`读取数据失败: ${err.message}`);
  }
}

/**
 * 将数据写入 JSON 文件
 * @param {{ workouts: Array }} data
 */
async function writeData(data) {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`写入数据失败: ${err.message}`);
  }
}

// ── 公开 API ────────────────────────────────────────────────────────────────

/**
 * 返回所有训练记录（summary，不含 exercises 字段）
 * @returns {Promise<Array>}
 */
export async function getAllWorkouts() {
  const data = await readData();
  return data.workouts.map(({ exercises, ...summary }) => summary);
}

/**
 * 返回单条完整训练记录（含 exercises）
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getWorkout(id) {
  const data = await readData();
  const workout = data.workouts.find((w) => w.id === id);
  return workout ?? null;
}

/**
 * 创建新训练记录
 * @param {{ name: string, date: string }} param0
 * @returns {Promise<Object>}
 */
export async function createWorkout({ name, date }) {
  if (!name || !date) {
    throw new Error('name 和 date 为必填项');
  }

  const data = await readData();

  const newWorkout = {
    id: nanoid(),
    name,
    date,
    createdAt: new Date().toISOString(),
    exercises: [],
  };

  data.workouts.push(newWorkout);
  await writeData(data);

  return newWorkout;
}

/**
 * 向指定训练添加动作
 * @param {string} workoutId
 * @param {{ name: string, weight: number, sets: number, reps: number, note?: string }} exercise
 * @returns {Promise<Object>} 更新后的 workout
 */
export async function addExercise(workoutId, { name, weight, sets, reps, note = '' }) {
  if (!name || weight == null || sets == null || reps == null) {
    throw new Error('name、weight、sets、reps 为必填项');
  }

  const data = await readData();
  const workoutIndex = data.workouts.findIndex((w) => w.id === workoutId);

  if (workoutIndex === -1) {
    throw new Error(`未找到 ID 为 "${workoutId}" 的训练记录`);
  }

  const newExercise = {
    id: nanoid(),
    name,
    weight: Number(weight),
    sets: Number(sets),
    reps: Number(reps),
    note,
  };

  data.workouts[workoutIndex].exercises.push(newExercise);
  await writeData(data);

  return data.workouts[workoutIndex];
}

/**
 * 删除训练记录
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteWorkout(id) {
  const data = await readData();
  const originalLength = data.workouts.length;

  data.workouts = data.workouts.filter((w) => w.id !== id);

  if (data.workouts.length === originalLength) {
    return false;
  }

  await writeData(data);
  return true;
}

/**
 * 更新指定动作的数据
 * @param {string} workoutId
 * @param {string} exerciseId
 * @param {Partial<{ name: string, weight: number, sets: number, reps: number, note: string }>} updates
 * @returns {Promise<Object>} 更新后的 workout
 */
export async function updateExercise(workoutId, exerciseId, updates) {
  const data = await readData();
  const workoutIndex = data.workouts.findIndex((w) => w.id === workoutId);

  if (workoutIndex === -1) {
    throw new Error(`未找到 ID 为 "${workoutId}" 的训练记录`);
  }

  const exerciseIndex = data.workouts[workoutIndex].exercises.findIndex(
    (e) => e.id === exerciseId
  );

  if (exerciseIndex === -1) {
    throw new Error(`未找到 ID 为 "${exerciseId}" 的动作记录`);
  }

  const allowedFields = ['name', 'weight', 'sets', 'reps', 'note'];
  const sanitizedUpdates = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] =
        ['weight', 'sets', 'reps'].includes(field) ? Number(updates[field]) : updates[field];
    }
  }

  data.workouts[workoutIndex].exercises[exerciseIndex] = {
    ...data.workouts[workoutIndex].exercises[exerciseIndex],
    ...sanitizedUpdates,
  };

  await writeData(data);

  return data.workouts[workoutIndex];
}

/**
 * 删除指定训练中的某个动作
 * @param {string} workoutId
 * @param {string} exerciseId
 * @returns {Promise<Object>} 更新后的 workout
 */
export async function deleteExercise(workoutId, exerciseId) {
  const data = await readData();
  const workoutIndex = data.workouts.findIndex((w) => w.id === workoutId);

  if (workoutIndex === -1) {
    throw new Error(`未找到 ID 为 "${workoutId}" 的训练记录`);
  }

  const originalLength = data.workouts[workoutIndex].exercises.length;
  data.workouts[workoutIndex].exercises = data.workouts[workoutIndex].exercises.filter(
    (e) => e.id !== exerciseId
  );

  if (data.workouts[workoutIndex].exercises.length === originalLength) {
    throw new Error(`未找到 ID 为 "${exerciseId}" 的动作记录`);
  }

  await writeData(data);

  return data.workouts[workoutIndex];
}
