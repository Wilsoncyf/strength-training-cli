import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getAllWorkouts, getWorkout } from '../db.js';
import { editExercise, removeExercise } from '../logic.js';

export async function handleEditMenu() {
  console.log('');
  console.log(chalk.bold.cyan('── 编辑 / 删除动作 ──'));

  const allWorkouts = await getAllWorkouts();
  if (allWorkouts.length === 0) {
    console.log(chalk.yellow('  暂无训练记录。'));
    return;
  }

  // 选择训练
  const { workoutId } = await inquirer.prompt([{
    type: 'list',
    name: 'workoutId',
    message: chalk.cyan('选择训练：'),
    choices: allWorkouts.map(w => ({ name: `${w.date}  -  ${w.name}`, value: w.id })),
  }]);

  const workout = await getWorkout(workoutId);
  const exercises = workout?.exercises || [];

  if (exercises.length === 0) {
    console.log(chalk.yellow('  该训练暂无动作。'));
    return;
  }

  // 展示动作列表
  const table = new Table({
    head: [chalk.bold.cyan('#'), chalk.bold.cyan('动作'), chalk.bold.cyan('重量'), chalk.bold.cyan('组数'), chalk.bold.cyan('次数'), chalk.bold.cyan('备注')],
    colAligns: ['right', 'left', 'right', 'center', 'center', 'left'],
    style: { head: [], border: [] },
  });
  exercises.forEach((ex, i) => {
    table.push([i + 1, ex.name, `${ex.weight}kg`, ex.sets, ex.reps, ex.note || '-']);
  });
  console.log('');
  console.log(table.toString());

  // 选择动作
  const { exerciseId } = await inquirer.prompt([{
    type: 'list',
    name: 'exerciseId',
    message: chalk.cyan('选择要操作的动作：'),
    choices: exercises.map(ex => ({
      name: `${ex.name}  ${ex.weight}kg × ${ex.sets}组 × ${ex.reps}次`,
      value: ex.id,
    })),
  }]);

  const { operation } = await inquirer.prompt([{
    type: 'list',
    name: 'operation',
    message: chalk.cyan('请选择操作：'),
    choices: [
      { name: '✏️  编辑动作数据', value: 'edit' },
      { name: '🗑️  删除此动作', value: 'delete' },
      { name: '↩  取消', value: 'cancel' },
    ],
  }]);

  if (operation === 'cancel') {
    console.log(chalk.cyan('  已取消。'));
    return;
  }

  const targetExercise = exercises.find(ex => ex.id === exerciseId);

  if (operation === 'delete') {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: chalk.yellow(`确定删除动作「${targetExercise?.name}」吗？`),
      default: false,
    }]);
    if (!confirmed) { console.log(chalk.cyan('  已取消。')); return; }
    await removeExercise(workoutId, exerciseId);
    console.log(chalk.green(`  ✓ 动作「${targetExercise?.name}」已删除。`));
    return;
  }

  // 编辑
  console.log(chalk.gray(`  当前：${targetExercise.name}  ${targetExercise.weight}kg × ${targetExercise.sets}组 × ${targetExercise.reps}次`));
  const updates = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: chalk.cyan('动作名称：'),
      default: targetExercise.name,
      validate: v => v.trim() ? true : '不能为空',
    },
    {
      type: 'number',
      name: 'weight',
      message: chalk.cyan('重量(kg)：'),
      default: targetExercise.weight,
      validate: v => v > 0 ? true : '必须大于 0',
    },
    {
      type: 'number',
      name: 'sets',
      message: chalk.cyan('组数：'),
      default: targetExercise.sets,
      validate: v => v > 0 ? true : '必须大于 0',
    },
    {
      type: 'number',
      name: 'reps',
      message: chalk.cyan('每组次数：'),
      default: targetExercise.reps,
      validate: v => v > 0 ? true : '必须大于 0',
    },
    {
      type: 'input',
      name: 'note',
      message: chalk.cyan('备注（可选）：'),
      default: targetExercise.note || '',
    },
  ]);

  await editExercise(workoutId, exerciseId, {
    name: updates.name.trim(),
    weight: Number(updates.weight),
    sets: Number(updates.sets),
    reps: Number(updates.reps),
    note: updates.note.trim(),
  });

  const newVolume = Number(updates.weight) * Number(updates.sets) * Number(updates.reps);
  console.log(chalk.green(`  ✓ 动作「${updates.name}」已更新。本组容量：${newVolume} kg`));
  console.log('');
}
