import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getPersonalRecords, getExerciseHistory } from '../db.js';

/**
 * 显示个人最佳(PR)表格
 */
async function showPersonalRecords() {
  const records = await getPersonalRecords();
  const entries = Object.entries(records);

  if (entries.length === 0) {
    console.log(chalk.yellow('  暂无个人最佳记录，开始记录训练后自动生成。'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold.cyan('动作'),
      chalk.bold.cyan('最大重量(kg)'),
      chalk.bold.cyan('组数'),
      chalk.bold.cyan('次数'),
      chalk.bold.cyan('创造日期'),
    ],
    colAligns: ['left', 'right', 'center', 'center', 'center'],
    style: { head: [], border: [] },
  });

  // 按重量降序排列
  entries
    .sort((a, b) => b[1].weight - a[1].weight)
    .forEach(([name, pr]) => {
      table.push([name, `🏆 ${pr.weight}`, pr.sets, pr.reps, pr.date || '-']);
    });

  console.log('');
  console.log(chalk.bold.cyan('── 个人最佳记录(PR) ──'));
  console.log(table.toString());
  console.log('');
}

/**
 * 查看某个动作的历史进度
 */
async function showExerciseProgress() {
  const records = await getPersonalRecords();
  const exerciseNames = Object.keys(records);

  if (exerciseNames.length === 0) {
    console.log(chalk.yellow('  暂无训练记录。'));
    return;
  }

  const { exerciseName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'exerciseName',
      message: chalk.cyan('选择要查看进度的动作：'),
      choices: exerciseNames,
    },
  ]);

  const history = await getExerciseHistory(exerciseName);

  if (history.length === 0) {
    console.log(chalk.yellow('  暂无该动作的历史记录。'));
    return;
  }

  console.log('');
  console.log(chalk.bold.cyan(`── ${exerciseName} 历史进度 ──`));

  const table = new Table({
    head: [
      chalk.bold.cyan('日期'),
      chalk.bold.cyan('重量(kg)'),
      chalk.bold.cyan('组数'),
      chalk.bold.cyan('次数'),
      chalk.bold.cyan('训练'),
      chalk.bold.cyan('趋势'),
    ],
    colAligns: ['center', 'right', 'center', 'center', 'left', 'center'],
    style: { head: [], border: [] },
  });

  history.forEach((entry, i) => {
    let trend = '-';
    if (i > 0) {
      const diff = entry.weight - history[i - 1].weight;
      if (diff > 0) trend = chalk.green(`↑ +${diff}`);
      else if (diff < 0) trend = chalk.red(`↓ ${diff}`);
      else trend = chalk.gray('→ 持平');
    }
    table.push([entry.date, entry.weight, entry.sets, entry.reps, entry.workoutName, trend]);
  });

  console.log(table.toString());

  // ASCII 迷你图
  const weights = history.map(h => h.weight);
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  const range = max - min || 1;
  const BAR_HEIGHT = 5;

  console.log(chalk.bold.cyan('\n重量趋势图：'));
  for (let row = BAR_HEIGHT; row >= 0; row--) {
    const threshold = min + (range * row) / BAR_HEIGHT;
    let line = row === BAR_HEIGHT ? chalk.gray(`${max}kg `) : row === 0 ? chalk.gray(`${min}kg `) : '      ';
    weights.forEach(w => {
      line += w >= threshold ? chalk.cyan('█ ') : '  ';
    });
    console.log(line);
  }
  console.log('');
}

/**
 * PR & 进度菜单（由 cli.js 调用）
 */
export async function handleProgressMenu() {
  console.log('');
  console.log(chalk.bold.cyan('── 个人最佳 & 进度 ──'));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.cyan('请选择：'),
      choices: [
        { name: '🏆 查看个人最佳(PR)', value: 'pr' },
        { name: '📈 查看动作历史进度', value: 'progress' },
        { name: '↩  返回主菜单', value: 'back' },
      ],
    },
  ]);

  if (action === 'pr') {
    await showPersonalRecords();
  } else if (action === 'progress') {
    await showExerciseProgress();
  }
}
