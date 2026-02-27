import chalk from 'chalk';
import Table from 'cli-table3';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = join(__dirname, '..', '..', 'data', 'workouts.json');

async function loadAllWorkouts() {
  if (!existsSync(DATA_FILE)) return [];
  const raw = await readFile(DATA_FILE, 'utf-8');
  const data = JSON.parse(raw);
  return data.workouts || [];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function workoutVolume(exercises) {
  return (exercises || []).reduce((sum, ex) => sum + ex.weight * ex.sets * ex.reps, 0);
}

export async function handleStatsMenu() {
  console.log('');
  console.log(chalk.bold.cyan('── 数据统计看板 ──'));

  const workouts = await loadAllWorkouts();
  if (workouts.length === 0) {
    console.log(chalk.yellow('  暂无训练数据。'));
    return;
  }

  // 总览
  const totalWorkouts = workouts.length;
  const totalExercises = workouts.reduce((s, w) => s + (w.exercises?.length || 0), 0);
  const totalVolume = workouts.reduce((s, w) => s + workoutVolume(w.exercises), 0);
  const allDates = workouts.map(w => w.date).sort();

  console.log('');
  const overviewTable = new Table({
    head: [chalk.bold.cyan('统计项'), chalk.bold.cyan('数值')],
    colAligns: ['left', 'right'],
    style: { head: [], border: [] },
  });
  overviewTable.push(
    ['训练总次数', `${totalWorkouts} 次`],
    ['动作总记录数', `${totalExercises} 条`],
    ['累计训练总容量', `${totalVolume.toLocaleString()} kg`],
    ['首次训练日期', allDates[0]],
    ['最近训练日期', allDates[allDates.length - 1]],
  );
  console.log(overviewTable.toString());

  // 近8周容量趋势
  const weekMap = {};
  for (const w of workouts) {
    const week = getWeekStart(w.date);
    weekMap[week] = (weekMap[week] || 0) + workoutVolume(w.exercises);
  }
  const sortedWeeks = Object.keys(weekMap).sort().slice(-8);
  const weekVolumes = sortedWeeks.map(w => weekMap[w]);

  if (sortedWeeks.length >= 1) {
    const maxVol = Math.max(...weekVolumes);
    const BAR_WIDTH = 20;
    console.log('');
    console.log(chalk.bold.cyan('近8周训练容量趋势（kg）：'));
    console.log('');
    sortedWeeks.forEach((week, i) => {
      const vol = weekVolumes[i];
      const barLen = maxVol > 0 ? Math.round((vol / maxVol) * BAR_WIDTH) : 0;
      const bar = chalk.cyan('█'.repeat(barLen)) + chalk.gray('░'.repeat(BAR_WIDTH - barLen));
      console.log(`  ${chalk.gray(week.slice(5))}  ${bar}  ${chalk.white(vol.toLocaleString() + ' kg')}`);
    });
    console.log('');
  }

  // 动作频次 Top 5
  const exerciseFreq = {};
  for (const w of workouts) {
    for (const ex of (w.exercises || [])) {
      exerciseFreq[ex.name] = (exerciseFreq[ex.name] || 0) + 1;
    }
  }
  const topExercises = Object.entries(exerciseFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topExercises.length > 0) {
    console.log(chalk.bold.cyan('动作频次 Top 5：'));
    const freqTable = new Table({
      head: [chalk.bold.cyan('排名'), chalk.bold.cyan('动作名'), chalk.bold.cyan('出现次数')],
      colAligns: ['center', 'left', 'center'],
      style: { head: [], border: [] },
    });
    const medals = ['🥇', '🥈', '🥉'];
    topExercises.forEach(([name, count], i) => {
      freqTable.push([medals[i] || `${i + 1}.`, name, `${count} 次`]);
    });
    console.log(freqTable.toString());
  }
  console.log('');
}
