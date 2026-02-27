import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  createWorkoutSession,
  recordExercise,
  getWorkoutSummary,
  listWorkouts,
  removeWorkout,
  calculateVolume,
} from './logic.js';
import { handleProgressMenu } from './screens/progress.js';
import { handleTemplatesMenu } from './screens/templates.js';
import { handleStatsMenu } from './screens/stats.js';
import { handleEditMenu } from './screens/edit.js';

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log(chalk.bgCyan.bold.white('                                          '));
  console.log(chalk.bgCyan.bold.white('     💪  力量训练记录工具  CLI  v2.0.0    '));
  console.log(chalk.bgCyan.bold.white('                                          '));
  console.log('');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── 添加动作循环 ─────────────────────────────────────────────────────────────

async function addExercisesLoop(workoutId) {
  let continueAdding = true;

  while (continueAdding) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: chalk.cyan('动作名称（如 卧推、深蹲）：'),
        validate: (v) => (v.trim() ? true : '动作名称不能为空'),
      },
      {
        type: 'number',
        name: 'weight',
        message: chalk.cyan('重量（kg）：'),
        validate: (v) => (v > 0 ? true : '重量必须大于 0'),
      },
      {
        type: 'number',
        name: 'sets',
        message: chalk.cyan('组数：'),
        validate: (v) => (v > 0 ? true : '组数必须大于 0'),
      },
      {
        type: 'number',
        name: 'reps',
        message: chalk.cyan('每组次数：'),
        validate: (v) => (v > 0 ? true : '次数必须大于 0'),
      },
      {
        type: 'input',
        name: 'note',
        message: chalk.cyan('备注（可选，直接回车跳过）：'),
      },
    ]);

    try {
      await recordExercise(workoutId, {
        name: answers.name.trim(),
        weight: Number(answers.weight),
        sets: Number(answers.sets),
        reps: Number(answers.reps),
        note: answers.note.trim() || '',
      });
      console.log(chalk.green('  动作已记录！'));
    } catch (err) {
      console.log(chalk.red(`  记录失败：${err.message}`));
    }

    const { more } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'more',
        message: chalk.cyan('是否继续添加动作？'),
        default: true,
      },
    ]);
    continueAdding = more;
  }

  // 显示本次训练总容量
  try {
    const summary = await getWorkoutSummary(workoutId);
    console.log('');
    console.log(
      chalk.bold.cyan('本次训练总容量：') +
        chalk.bold.white(`${summary.totalVolume} kg`)
    );
    if (summary.heaviestLift) {
      console.log(
        chalk.cyan('最大重量动作：') +
          chalk.white(
            `${summary.heaviestLift.name}  ${summary.heaviestLift.weight} kg`
          )
      );
    }
    console.log('');
  } catch (err) {
    console.log(chalk.red(`  获取摘要失败：${err.message}`));
  }
}

// ─── 选择训练（共用）────────────────────────────────────────────────────────

async function selectWorkout(prompt = '请选择训练：') {
  const workouts = await listWorkouts();
  if (workouts.length === 0) {
    console.log(chalk.yellow('  暂无训练记录，请先新建一条训练。'));
    return null;
  }

  const choices = workouts.map((w) => ({
    name: `${w.date}  -  ${w.name}  （${w.exerciseCount} 个动作）`,
    value: w.id,
  }));

  const { workoutId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'workoutId',
      message: chalk.cyan(prompt),
      choices,
    },
  ]);

  return workoutId;
}

// ─── 功能 1：新建训练 ─────────────────────────────────────────────────────────

async function handleNewWorkout() {
  console.log('');
  console.log(chalk.bold.cyan('── 新建训练 ──'));

  const { name, date } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: chalk.cyan('训练名称（如 推胸日、腿日）：'),
      validate: (v) => (v.trim() ? true : '训练名称不能为空'),
    },
    {
      type: 'input',
      name: 'date',
      message: chalk.cyan(`日期（YYYY-MM-DD，默认 ${today()}）：`),
      default: today(),
      validate: (v) =>
        /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : '请输入正确的日期格式 YYYY-MM-DD',
    },
  ]);

  try {
    const workout = await createWorkoutSession(name.trim(), date);
    console.log(
      chalk.green(`\n  训练「${workout.name}」已创建（${workout.date}）\n`)
    );
    console.log(chalk.bold.cyan('── 添加动作 ──'));
    await addExercisesLoop(workout.id);
  } catch (err) {
    console.log(chalk.red(`  创建失败：${err.message}`));
  }
}

// ─── 功能 2：查看所有训练 ─────────────────────────────────────────────────────

async function handleListWorkouts() {
  console.log('');
  console.log(chalk.bold.cyan('── 所有训练记录 ──'));

  try {
    const workouts = await listWorkouts();
    if (workouts.length === 0) {
      console.log(chalk.yellow('  暂无训练记录。'));
      return;
    }

    const table = new Table({
      head: [
        chalk.bold.cyan('序号'),
        chalk.bold.cyan('日期'),
        chalk.bold.cyan('训练名称'),
        chalk.bold.cyan('动作数量'),
      ],
      colAligns: ['right', 'center', 'left', 'center'],
      style: { head: [], border: [] },
    });

    workouts.forEach((w, i) => {
      table.push([i + 1, w.date, w.name, `${w.exerciseCount} 个`]);
    });

    console.log(table.toString());
    console.log('');
  } catch (err) {
    console.log(chalk.red(`  获取失败：${err.message}`));
  }
}

// ─── 功能 3：查看训练详情 ─────────────────────────────────────────────────────

async function handleWorkoutDetail() {
  console.log('');
  console.log(chalk.bold.cyan('── 查看训练详情 ──'));

  try {
    const workoutId = await selectWorkout('选择要查看的训练：');
    if (!workoutId) return;

    const summary = await getWorkoutSummary(workoutId);
    const { workout, totalVolume, heaviestLift, formattedDate } = summary;
    const exercises = workout.exercises || [];

    console.log('');
    console.log(
      chalk.bold.cyan('训练名称：') + chalk.bold.white(workout.name)
    );
    console.log(chalk.cyan('日    期：') + chalk.white(formattedDate));
    console.log('');

    if (exercises.length === 0) {
      console.log(chalk.yellow('  该训练暂无动作记录。'));
    } else {
      const table = new Table({
        head: [
          chalk.bold.cyan('动作名'),
          chalk.bold.cyan('重量(kg)'),
          chalk.bold.cyan('组数'),
          chalk.bold.cyan('次数'),
          chalk.bold.cyan('单动作容量(kg)'),
        ],
        colAligns: ['left', 'right', 'center', 'center', 'right'],
        style: { head: [], border: [] },
      });

      exercises.forEach((ex) => {
        const vol = calculateVolume([ex]);
        table.push([
          ex.name,
          ex.weight,
          ex.sets,
          ex.reps,
          vol,
        ]);
      });

      console.log(table.toString());
      console.log('');
      console.log(
        chalk.bold.cyan('总容量：') + chalk.bold.white(`${totalVolume} kg`)
      );
      if (heaviestLift) {
        console.log(
          chalk.cyan('最大重量动作：') +
            chalk.white(`${heaviestLift.name}  ${heaviestLift.weight} kg`)
        );
      }
    }
    console.log('');
  } catch (err) {
    console.log(chalk.red(`  获取详情失败：${err.message}`));
  }
}

// ─── 功能 4：继续添加动作 ─────────────────────────────────────────────────────

async function handleAddExercises() {
  console.log('');
  console.log(chalk.bold.cyan('── 继续添加动作 ──'));

  try {
    const workoutId = await selectWorkout('选择要添加动作的训练：');
    if (!workoutId) return;

    console.log('');
    await addExercisesLoop(workoutId);
  } catch (err) {
    console.log(chalk.red(`  操作失败：${err.message}`));
  }
}

// ─── 功能 5：删除训练 ─────────────────────────────────────────────────────────

async function handleDeleteWorkout() {
  console.log('');
  console.log(chalk.bold.cyan('── 删除训练 ──'));

  try {
    const workouts = await listWorkouts();
    if (workouts.length === 0) {
      console.log(chalk.yellow('  暂无训练记录。'));
      return;
    }

    const workoutId = await selectWorkout('选择要删除的训练：');
    if (!workoutId) return;

    const target = workouts.find((w) => w.id === workoutId);
    const displayName = target ? `${target.date} - ${target.name}` : workoutId;

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: chalk.yellow(`确定要删除「${displayName}」吗？此操作不可撤销。`),
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.cyan('  已取消删除。'));
      return;
    }

    const ok = await removeWorkout(workoutId);
    if (ok) {
      console.log(chalk.green(`  训练「${displayName}」已成功删除。`));
    } else {
      console.log(chalk.red('  删除失败，请重试。'));
    }
    console.log('');
  } catch (err) {
    console.log(chalk.red(`  删除失败：${err.message}`));
  }
}

// ─── 主函数 ───────────────────────────────────────────────────────────────────

export async function startCLI() {
  printBanner();

  const MENU_CHOICES = [
    { name: '📝 新建训练',           value: 'new' },
    { name: '📋 查看所有训练',       value: 'list' },
    { name: '🔍 查看训练详情',       value: 'detail' },
    { name: '✏️  继续添加动作',       value: 'add' },
    { name: '🖊️  编辑 / 删除动作',   value: 'edit' },
    { name: '🗑️  删除训练',           value: 'delete' },
    { name: new inquirer.Separator('── 进阶功能 ──'), value: null },
    { name: '🏆 个人最佳 & 进度',    value: 'progress' },
    { name: '📁 训练模板',           value: 'templates' },
    { name: '📊 数据统计看板',       value: 'stats' },
    { name: new inquirer.Separator(), value: null },
    { name: '🚪 退出',               value: 'exit' },
  ];

  let running = true;

  while (running) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold.cyan('请选择操作：'),
        choices: MENU_CHOICES,
        pageSize: 10,
      },
    ]);

    switch (action) {
      case 'new':
        await handleNewWorkout().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'list':
        await handleListWorkouts().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'detail':
        await handleWorkoutDetail().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'add':
        await handleAddExercises().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'edit':
        await handleEditMenu().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'delete':
        await handleDeleteWorkout().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'progress':
        await handleProgressMenu().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'templates':
        await handleTemplatesMenu().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'stats':
        await handleStatsMenu().catch((err) =>
          console.log(chalk.red(`错误：${err.message}`))
        );
        break;

      case 'exit':
        console.log('');
        console.log(chalk.bold.cyan('感谢使用力量训练记录工具，再见！'));
        console.log('');
        running = false;
        break;

      default:
        console.log(chalk.yellow('未知操作，请重新选择。'));
    }
  }
}
