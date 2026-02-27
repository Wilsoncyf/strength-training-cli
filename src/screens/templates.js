import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getTemplates, saveTemplate, getTemplate, deleteTemplate } from '../templateStore.js';
import { getWorkout, getAllWorkouts } from '../db.js';
import { createWorkoutSession, recordExercise } from '../logic.js';

/**
 * 查看所有模板
 */
async function showTemplates() {
  const templates = await getTemplates();
  if (templates.length === 0) {
    console.log(chalk.yellow('  暂无模板，可将已有训练保存为模板。'));
    return;
  }

  const table = new Table({
    head: [chalk.bold.cyan('序号'), chalk.bold.cyan('模板名称'), chalk.bold.cyan('动作数'), chalk.bold.cyan('创建时间')],
    colAligns: ['right', 'left', 'center', 'center'],
    style: { head: [], border: [] },
  });

  templates.forEach((t, i) => {
    const date = new Date(t.createdAt).toLocaleDateString('zh-CN');
    table.push([i + 1, t.name, `${t.exerciseCount} 个`, date]);
  });

  console.log('');
  console.log(table.toString());
}

/**
 * 将已有训练保存为模板
 */
async function handleSaveAsTemplate() {
  // 获取所有训练
  const allWorkouts = await getAllWorkouts();
  if (allWorkouts.length === 0) {
    console.log(chalk.yellow('  暂无训练记录可保存为模板。'));
    return;
  }

  const { workoutId } = await inquirer.prompt([{
    type: 'list',
    name: 'workoutId',
    message: chalk.cyan('选择要保存为模板的训练：'),
    choices: allWorkouts.map(w => ({ name: `${w.date} - ${w.name}`, value: w.id })),
  }]);

  const workout = await getWorkout(workoutId);
  if (!workout?.exercises?.length) {
    console.log(chalk.yellow('  该训练没有动作，无法保存为模板。'));
    return;
  }

  const { templateName } = await inquirer.prompt([{
    type: 'input',
    name: 'templateName',
    message: chalk.cyan('模板名称：'),
    default: workout.name,
    validate: v => v.trim() ? true : '模板名称不能为空',
  }]);

  await saveTemplate(templateName, workout.exercises);
  console.log(chalk.green(`  ✓ 模板「${templateName}」保存成功！（${workout.exercises.length} 个动作）`));
}

/**
 * 使用模板开始新训练
 */
async function handleLoadTemplate() {
  const templates = await getTemplates();
  if (templates.length === 0) {
    console.log(chalk.yellow('  暂无可用模板。'));
    return;
  }

  const { templateId } = await inquirer.prompt([{
    type: 'list',
    name: 'templateId',
    message: chalk.cyan('选择要使用的模板：'),
    choices: templates.map(t => ({
      name: `${t.name}（${t.exerciseCount} 个动作）`,
      value: t.id,
    })),
  }]);

  const template = await getTemplate(templateId);

  console.log('');
  console.log(chalk.bold.cyan(`── 基于模板「${template.name}」开始训练 ──`));
  console.log(chalk.gray('模板动作：'));
  template.exercises.forEach((ex, i) => {
    console.log(chalk.gray(`  ${i + 1}. ${ex.name}  ${ex.weight}kg × ${ex.sets}组 × ${ex.reps}次`));
  });
  console.log('');

  const today = new Date().toISOString().slice(0, 10);
  const { sessionName, sessionDate } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sessionName',
      message: chalk.cyan('训练名称：'),
      default: template.name,
      validate: v => v.trim() ? true : '不能为空',
    },
    {
      type: 'input',
      name: 'sessionDate',
      message: chalk.cyan(`日期（默认 ${today}）：`),
      default: today,
      validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? true : '格式应为 YYYY-MM-DD',
    },
  ]);

  const session = await createWorkoutSession(sessionName.trim(), sessionDate);
  console.log(chalk.green(`\n  训练「${session.name}」已创建，开始按模板记录动作...\n`));

  let totalVolume = 0;
  for (const ex of template.exercises) {
    console.log(chalk.bold(`  动作：${ex.name}（模板：${ex.weight}kg × ${ex.sets}组 × ${ex.reps}次）`));

    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'weight',
        message: chalk.cyan('    今日重量(kg)：'),
        default: ex.weight,
        validate: v => v > 0 ? true : '重量必须大于 0',
      },
      {
        type: 'number',
        name: 'sets',
        message: chalk.cyan('    组数：'),
        default: ex.sets,
        validate: v => v > 0 ? true : '组数必须大于 0',
      },
      {
        type: 'number',
        name: 'reps',
        message: chalk.cyan('    每组次数：'),
        default: ex.reps,
        validate: v => v > 0 ? true : '次数必须大于 0',
      },
    ]);

    await recordExercise(session.id, {
      name: ex.name,
      weight: Number(answers.weight),
      sets: Number(answers.sets),
      reps: Number(answers.reps),
      note: ex.note || '',
    });

    totalVolume += Number(answers.weight) * Number(answers.sets) * Number(answers.reps);
    console.log(chalk.green('    ✓ 已记录'));
    console.log('');
  }

  console.log(chalk.bold.cyan(`本次训练完成！总容量：${totalVolume} kg`));
  console.log('');
}

/**
 * 删除模板
 */
async function handleDeleteTemplate() {
  const templates = await getTemplates();
  if (templates.length === 0) {
    console.log(chalk.yellow('  暂无模板。'));
    return;
  }

  const { templateId } = await inquirer.prompt([{
    type: 'list',
    name: 'templateId',
    message: chalk.cyan('选择要删除的模板：'),
    choices: templates.map(t => ({ name: `${t.name}（${t.exerciseCount} 个动作）`, value: t.id })),
  }]);

  const target = templates.find(t => t.id === templateId);
  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: chalk.yellow(`确定删除模板「${target?.name}」吗？`),
    default: false,
  }]);

  if (!confirmed) { console.log(chalk.cyan('  已取消。')); return; }

  const ok = await deleteTemplate(templateId);
  console.log(ok ? chalk.green('  ✓ 模板已删除。') : chalk.red('  删除失败。'));
}

/**
 * 训练模板菜单（由 cli.js 调用）
 */
export async function handleTemplatesMenu() {
  console.log('');
  console.log(chalk.bold.cyan('── 训练模板 ──'));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: chalk.cyan('请选择：'),
    choices: [
      { name: '📋 查看所有模板', value: 'list' },
      { name: '💾 将训练保存为模板', value: 'save' },
      { name: '🚀 使用模板开始训练', value: 'load' },
      { name: '🗑️  删除模板', value: 'delete' },
      { name: '↩  返回主菜单', value: 'back' },
    ],
  }]);

  if (action === 'list') await showTemplates();
  else if (action === 'save') await handleSaveAsTemplate();
  else if (action === 'load') await handleLoadTemplate();
  else if (action === 'delete') await handleDeleteTemplate();
}
