# 💪 Strength Training CLI

一个基于 Node.js 的命令行力量训练记录工具，帮助你追踪每次训练的动作、重量、组数、次数，并自动计算训练总容量（Volume）。

## 功能特性

- 📝 **新建训练**：按日期创建训练会话（推胸日、腿日等）
- 🏋️ **记录动作**：记录每个动作的重量、组数、次数及备注
- 📊 **训练容量计算**：自动计算 Volume（重量 × 组数 × 次数）
- 📋 **查看记录**：表格形式展示历史训练列表
- 🔍 **训练详情**：查看单次训练的动作明细与汇总数据
- ✏️ **追加动作**：随时向已有训练添加新动作
- 🗑️ **删除训练**：带二次确认的安全删除

## 技术栈

| 层级 | 技术 |
|------|------|
| 交互界面 | [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) v9 |
| 终端样式 | [Chalk](https://github.com/chalk/chalk) v5 |
| 表格展示 | [cli-table3](https://github.com/cli-table/cli-table3) |
| 数据存储 | 本地 JSON 文件（`data/workouts.json`） |
| ID 生成 | [nanoid](https://github.com/ai/nanoid) |
| 运行环境 | Node.js（ES Module） |

## 项目结构

```
strength-training-cli/
├── index.js            # 入口文件
├── package.json
├── data/
│   └── workouts.json   # 本地持久化数据（自动生成）
└── src/
    ├── db.js           # 数据层：JSON 文件 CRUD 操作
    ├── logic.js        # 业务层：训练逻辑与容量计算
    └── cli.js          # 界面层：inquirer 交互式菜单
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动程序

```bash
npm start
```

### 主菜单

```
╔════════════════════════════════╗
║      💪 力量训练记录工具        ║
╚════════════════════════════════╝

? 请选择操作：
  📝 新建训练
  📋 查看所有训练
  🔍 查看训练详情
  ✏️  继续添加动作
  🗑️  删除训练
  🚪 退出
```

## 训练容量（Volume）

> Volume = Σ（重量 × 组数 × 次数）

**示例：**

| 动作 | 重量 | 组数 | 次数 | 容量 |
|------|------|------|------|------|
| 卧推 | 100kg | 5 | 5 | 2500kg |
| 上斜卧推 | 80kg | 4 | 8 | 2560kg |
| 飞鸟 | 20kg | 3 | 12 | 720kg |
| **合计** | — | — | — | **5780kg** |

## 开发背景

本项目由 3 个 Agent 组成的团队并行开发：

- **队友 1**：搭建项目结构，实现 JSON 数据存储层（`db.js`）
- **队友 2**：实现核心业务逻辑与容量计算（`logic.js`）
- **队友 3**：使用 Inquirer.js 构建交互式终端界面（`cli.js`）

## 数据存储格式

数据保存在 `data/workouts.json`，格式如下：

```json
{
  "workouts": [
    {
      "id": "uGtwZmVp6rQ-G2BlUsgY1",
      "name": "推胸日",
      "date": "2026-02-27",
      "createdAt": "2026-02-27T09:00:00.000Z",
      "exercises": [
        {
          "id": "abc123",
          "name": "卧推",
          "weight": 100,
          "sets": 5,
          "reps": 5,
          "note": ""
        }
      ]
    }
  ]
}
```

## License

MIT
