import {
  getAllWorkouts,
  getWorkout,
  createWorkout,
  addExercise,
  deleteWorkout,
  updateExercise,
  deleteExercise,
} from './db.js';

/**
 * 计算训练总容量（kg）
 * @param {Array} exercises - 动作列表
 * @returns {number} 总容量
 */
export function calculateVolume(exercises) {
  if (!exercises || exercises.length === 0) return 0;
  return exercises.reduce((total, ex) => {
    const weight = Number(ex.weight) || 0;
    const sets = Number(ex.sets) || 0;
    const reps = Number(ex.reps) || 0;
    return total + weight * sets * reps;
  }, 0);
}

/**
 * 创建训练会话
 * @param {string} name - 训练名称
 * @param {string} [date] - 日期（YYYY-MM-DD），默认今天
 * @returns {Promise<object>} 创建的 workout 对象
 */
export async function createWorkoutSession(name, date) {
  const workoutDate = date || new Date().toISOString().slice(0, 10);
  return await createWorkout({ name, date: workoutDate });
}

/**
 * 记录动作
 * @param {string|number} workoutId - 训练 ID
 * @param {object} exercise - 动作参数
 * @returns {Promise<object>} 更新后的 workout
 */
export async function recordExercise(workoutId, { name, weight, sets, reps, note }) {
  if (!name || String(name).trim() === '') {
    throw new Error('动作名称不能为空');
  }
  if (typeof weight !== 'number' || weight <= 0) {
    throw new Error('重量必须是正数');
  }
  if (typeof sets !== 'number' || sets <= 0) {
    throw new Error('组数必须是正数');
  }
  if (typeof reps !== 'number' || reps <= 0) {
    throw new Error('次数必须是正数');
  }
  return await addExercise(workoutId, { name: String(name).trim(), weight, sets, reps, note });
}

/**
 * 获取训练摘要
 * @param {string|number} workoutId - 训练 ID
 * @returns {Promise<object>} 训练摘要
 */
export async function getWorkoutSummary(workoutId) {
  const workout = await getWorkout(workoutId);
  const exercises = workout.exercises || [];

  const totalVolume = calculateVolume(exercises);
  const exerciseCount = exercises.length;

  let heaviestLift = null;
  if (exercises.length > 0) {
    const heaviest = exercises.reduce((max, ex) => {
      return Number(ex.weight) > Number(max.weight) ? ex : max;
    }, exercises[0]);
    heaviestLift = { name: heaviest.name, weight: heaviest.weight };
  }

  const formattedDate = formatDate(workout.date);

  return {
    workout,
    totalVolume,
    exerciseCount,
    heaviestLift,
    formattedDate,
  };
}

/**
 * 格式化日期为中文字符串 "YYYY年M月D日"
 * @param {string} dateStr - YYYY-MM-DD 格式的日期
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

/**
 * 列出所有训练（附带 exerciseCount 字段）
 * @returns {Promise<Array>} 训练列表
 */
export async function listWorkouts() {
  const workouts = await getAllWorkouts();
  return workouts.map((w) => ({
    ...w,
    exerciseCount: Array.isArray(w.exercises) ? w.exercises.length : (w.exerciseCount ?? 0),
  }));
}

/**
 * 删除训练
 * @param {string|number} workoutId - 训练 ID
 * @returns {Promise<boolean>}
 */
export async function removeWorkout(workoutId) {
  try {
    return await deleteWorkout(workoutId);
  } catch {
    return false;
  }
}

/**
 * 编辑动作
 * @param {string|number} workoutId - 训练 ID
 * @param {string|number} exerciseId - 动作 ID
 * @param {object} updates - 要更新的字段
 * @returns {Promise<object>} 更新后的 workout
 */
export async function editExercise(workoutId, exerciseId, updates) {
  if (updates.weight !== undefined) {
    const w = Number(updates.weight);
    if (isNaN(w) || w <= 0) {
      throw new Error('重量必须是正数');
    }
    updates = { ...updates, weight: w };
  }
  if (updates.sets !== undefined) {
    const s = Number(updates.sets);
    if (isNaN(s) || s <= 0) {
      throw new Error('组数必须是正数');
    }
    updates = { ...updates, sets: s };
  }
  if (updates.reps !== undefined) {
    const r = Number(updates.reps);
    if (isNaN(r) || r <= 0) {
      throw new Error('次数必须是正数');
    }
    updates = { ...updates, reps: r };
  }
  return await updateExercise(workoutId, exerciseId, updates);
}

/**
 * 删除动作
 * @param {string|number} workoutId - 训练 ID
 * @param {string|number} exerciseId - 动作 ID
 * @returns {Promise<object>} 更新后的 workout
 */
export async function removeExercise(workoutId, exerciseId) {
  return await deleteExercise(workoutId, exerciseId);
}
