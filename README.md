# midjourney-api

非官方的 MidJourney api 的 Node.js 客户端，实现api形式调用AI绘图，基于[`midjourney-api`](https://github.com/erictik/midjourney-api)的NPM插件实现

关于Remix说明：在项目启动时，会自动先Settings一下获取一些配置参数，包含Remix是否开启，所以项目启动后，如果在项目启动时再去discord进行Setting开关Remix等操作时，可能会导致项目停止报错之类的，所以尽量别去上面修改，或者修改后，再用项目的Settings更新下配置参数

node版本要求：Node.js > 18

暂时未编写Docker脚本，会node的自行研究部署

第一版时间紧凑，随便先发一下，过后慢慢完善

## 接口文档地址：https://console-docs.apipost.cn/preview/75480e45c043adf1/e78b73f9714ca480

## 已实现的API
- [x] /fetch 查询任务信息 GET
- [x] /imagine 想象 POST
- [x] /upsample 取样 POST
- [x] /variation 变化 POST
- [x] /reroll 重新生成 POST
- [x] /integrity vary zoom left up等指令(strong,subtle,2x,1.5x,left,right,up,down) POST
- [x] /describe 图生文 POST
- [x] /shorten 文本缩短 POST
- [x] /info 查询MJ信息 GET
- [x] /settings 查询settings信息 GET
- [x] /reset 重置设置 POST
- [x] /fast 切换快速模式 POST
- [x] /relax 切换放松模式 POST
- [x] /remix 混合 POST

remix可编辑传输prompt

## 后续计划
- [ ] 更多功能施工中

## 使用前提
1. 注册 MidJourney，创建自己的频道，参考 https://docs.midjourney.com/docs/quick-start
2. 获取用户Token、服务器ID、频道ID：[`获取方式`](./docs/discord.md)

![Star History Chart](https://api.star-history.com/svg?repos=mouxangithub/midjourney-api&type=Date)
