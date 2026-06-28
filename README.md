# Blokus Solo

ブロックス（Blokus）を1人で練習できるWebアプリ。プレイヤー（青）vs CPU3体（黄・赤・緑）。

🎮 **遊ぶ:** https://yoichiro-ashibe-umu.github.io/blokus-solo/

## 特徴
- 公式ルール準拠の20×20盤・21ピース×4色
- CPUの強さ4段階（弱 / 中 / 強 / 鬼）。強・鬼は手番順をランダム化
- 操作：ピース選択 → ↑↓キーで回転・←→キーで反転 → クリック/Enterで配置（スマホはタップ→確定）
- ヒント表示、パス、待った（1手戻す）
- 対戦履歴・自己ベストを localStorage に保存
- 効果音・アニメーション・紙吹雪演出

## 技術
React + Vite + TypeScript + Tailwind CSS。ゲームロジックは純粋関数として分離し Vitest でテスト。

## 開発
```bash
npm install
npm run dev      # 開発サーバー
npm test         # テスト
npm run build    # 本番ビルド
```

GitHub Actions（`.github/workflows/deploy.yml`）で main への push 時に自動デプロイ。
