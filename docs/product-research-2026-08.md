# TRIM NOTE 公開製品・一次資料調査

調査日: 2026-08-23  
対象: 420 / 470のセール形状学習Webアプリ  
目的: 一般的なセーリングゲームではなく、形状コントロールの因果学習でカテゴリ最高水準を目指す。

## 結論

既存製品の強みは大きく4系統に分かれる。

1. VPP／ポーラを使った性能シミュレーション
2. 回転可能な3D艇・風・テルテールによる没入型練習
3. 課題・得点・段階進行によるゲーム型習熟
4. 写真のドラフトストライプを数値化するセールメーカー向け計測

TRIM NOTEは1〜3を薄く広く模倣せず、420/470固有コントロールと4の計測方法を学習ループへ統合する。中心価値は、**一本を動かす → 操作前と今を重ねる → どの断面がどう変わったか数値で言う → 基準形と照合する**ことに置く。

## 競合・類似システム

| 製品・システム | 強み | 本プロダクトへ取り込む知見 |
|---|---|---|
| [North U Upwind Sail Trim Simulator](https://northu.com/sail-trim-simulator-user-guide/) | メイン／ジブ／ヘルム、風速・海象、複数視点、形状とSpeed/VMG/Heelを同時観察。一次・二次・三次コントロールを問う | 優先順位は固定ルールでなく、現在条件で最も改善量が大きい操作から再計算する |
| [SailRhythm](https://www.sailrhythm.com/) | 実測ポーラに較正したVPP、回転・ズーム可能な3D、draft/twistと性能の即時応答 | 形状と性能を同じ操作で同期させる。一方、学習用推定モデルを実測VPPと誤認させない |
| [NauticEd NED](https://www.nauticed.org/sailing-simulator) / [Advanced Game](https://www.nauticed.org/sail-trim-sailing-game) | 自由練習、風向角別の正しいトリム、効率メーター、90秒コースとスコア | 自由ラボの後に制約つき課題へ進む二層構造 |
| [2Sail](https://www.2sail.net/) | 3–30kt、telltales・shape・wakeなど画面上の全てを手掛かりにする。changing gearsを重視 | 画面装飾でなく、観察可能な手掛かりだけを置く |
| [Atterwind](https://github.com/flyinggorilla/simulator.atterwind.info) | 見かけの風と高さ方向のtwist、モデル仮定を公開、現在状態をURL共有 | モデルの限界を公開し、艇種・風・コントロール値を再現できるURLを作る |
| [ASA Sailing Challenge](https://americansailing.com/apps/sailing-challenge-app/) | 初心者向け短時間モジュール、段階進行、実感のある艇操作 | 高校生・大学生が一問ずつ進める短い課題。ただしタック／ジャイブは対象外 |
| [eSail](https://www.esailyachtsimulator.com/) | チュートリアル、チャレンジ、自由航行、レースを統合したフルヨットシミュレーション | 本アプリの範囲を形状学習へ限定し、巨大な航行ゲームと競争しない |

## セール形状の計測・比較

| 資料・ツール | 測る量・方法 | 設計判断 |
|---|---|---|
| [Curtin University SailTool](https://cmst.curtin.edu.au/products/sailtool-software/) | draft/camber、最大位置、twist、entry/exit angle、mast bend。別画像の同じstripeを比較 | 深さ・最大位置・ツイストだけでなく入口角／出口角を表示。操作前の同じstripeを重ねる |
| [UK Sailmakers Draft Stripes](https://www.uksailmakers.com/racing/draft-stripes-2/) | 高さの異なる水平ストライプで立体形状を視認 | 上・中・下の共通ストライプを三面図と断面図で同一化 |
| [SailProfile](https://sailprofiledata.com/UserGuide.html) | 3本のstripe、camber・draft position・twist、条件タグ、セッション比較 | 操作条件と計測値を同じ記録として残す |
| [SailWatcher](https://www.sailwatcher.com/) | 写真からcamber/chord/twist/entry/exitを測り、履歴と共有URLを保存 | 状態共有を画像でなく再計算可能なURLにする |
| [Sail Scan](https://sailscanapp.com/) | 写真→解析→調整、履歴とタック比較 | before/after比較を主操作にする |
| [VSPARS](https://www.vspars.com/sails.aspx) | 約3秒でcamber・draft・entry/exit・twist、mast bend、3D stripe座標 | 単一の3D面から全カメラと数値を作り、別々のイラストにしない |

## 420 / 470の一次資料から固定した因果

- [North Sails Japan 420 M11/M12 Tuning Guide](https://www.northsails.co.jp/wordpress/wp-content/uploads/2026/03/420-M12-Tuning-Guide_j.pdf): アウトホールは下部の深さ、チョックはバング使用時の下部形状、ジブ高さ／風上シーティングはリード角とリーチ形状に関係する。
- [North Sails 470 Tuning Guide](https://colorcode.northsails.com/sailing/wp-content/uploads/2017/05/470_tuning_guide_e01.pdf): カニンガムを引くと最大ドラフト位置が前へ移り、リーチが開いてフラットになる。アウトホールは下部深さ、ジブトラック後退はリーチを開く。
- [North Sails 470 Speed Guide](https://www.northsails.com/en-ca/blogs/north-sails-blog/470-speed-guide): メインはleech/twistを中心に見て、風・海面が増すとcunningham、outhaul、vangでデパワー。ダウンウインドはouthaul/cunninghamを緩め、リーチを開く。

## 420 / 470のクラス別セール輪郭

現行の[International 420 Class Rules 2026](https://media.sailing.org/sailing/wp-content/uploads/2022/03/17092130/420_CR_2026-03-31.pdf)と[International 470 Class Rules 2025](https://www.sailing.org/wp-content/uploads/2022/03/470_CR_2025-09-01-II.pdf)のSection Gを比較した。単一輪郭の一様拡大では、クラス差を再現できない。

| 計測値 | 420 | 470 |
|---|---:|---:|
| メイン・リーチ長 | 5400 mm | 6265 mm |
| メイン・フットボルトロープ長 | 1920 mm | 2200 mm |
| メイン・1/4幅 | 2130 mm | 2340 mm |
| メイン・1/2幅 | 1630 mm | 1790 mm |
| メイン・3/4幅 | 995 mm | 1050 mm |
| メイン・トップ幅 | 115 mm | 140 mm |
| メイン・バテン | 4本 | 3本 |
| ジブ・ラフ / リーチ / フット | 3500 / 3200 / 1750 mm | 4100 / 3750 / 1955 mm |
| ジブ・バテン | 最大3本（製品代表は3本） | 最大3本（製品代表は3本） |

実装を再監査した結果、ERSのクロス幅を同じ高さの水平コードとして置く方法は誤りと判断した。1/4・1/2・3/4幅はリーチ上の計測点から測る値であり、単純な高さ比ではない。そこで、420はNorth Sails M-12、470はN16-L18の公開製品シルエットを高さ1/16ごとに正規化し、現行クラス規則のフット、リーチ、トップ幅、ジブ三辺で実寸拘束する方式へ変更した。ジブのヘッド位置は三辺長から三角測量する。そこへ操作で変わるドラフト、最大位置、ツイスト、マストベンドを載せる。

船体は[420 Building Specification Drawing 5 Issue J](https://media.sailing.org/sailing/wp-content/uploads/2022/07/02133245/420_BuildingSpec_2022-09Sep-01.pdf)と[470 Building Specification Plan 470-003](https://media.sailing.org/sailing/wp-content/uploads/2023/01/19160058/470_005_080623_GA.pdf)の平面・側面輪郭を座標化した。420は12、470は11の長手ステーションを持ち、船長、最大幅、マスト位置、ジブタック位置、ブレークウォーター、コックピットを別々に拘束する。同じ船体メッシュを三方向へ投影し、視点別の記号的な船体イラストは廃止した。

420のメインバテン位置はクラスルールDiagram 17のヘッドから1220 / 2220 / 3220 / 4220 mmの計測位置を高さへ換算した。470メインは3本という構成とクロス幅計測点に合わせた代表位置を使う。ジブは両クラスの規則が最大3本を許し、North Sailsの現行製品図でも3本構成を確認できるため、代表位置として25 / 50 / 75%へ短いリーチバテンを置く。後方カメラは船尾中心線上の0°から船首方向を見る完全な正投影とする。クローズでセールが薄く重なる実際の見え方は保ち、色、ドラフト稜線、断面線の線幅で判読性を補う。

したがって、本モデルの観察優先は次の通りとする。

| 操作 | 最初に見る断面 | 主な変化 |
|---|---|---|
| カニンガム | メイン中部 | 最大ドラフト位置、入口／出口角、深さ |
| アウトホール | メイン下部 | 深さ |
| バング | メイン上部 | ツイスト／リーチ |
| 420 チョック | メイン下部 | ロワーマストベンドと深さ |
| 420 ジブ高さ | ジブ上部 | リード角とツイスト |
| 470 フォア／アフタープラー | メイン中〜下部 | 前後ベンドと深さ |
| 470 ジブリード前後 | ジブ上部 | ツイスト、下部深さ |

## 学習設計

- [PhET](https://phet.colorado.edu/translation/2720/about)は、操作の結果を即時に返す研究ベースのシミュレーションを設計原則としている。
- 物理のコンピュータ練習を扱った[APSの研究](https://journals.aps.org/prper/abstract/10.1103/PhysRevPhysEducRes.12.010134)では、単純で一般化可能な説明を伴う即時フィードバックが、特に準備度の低い学習者の成績改善に有効だった。
- 高校物理向けの[Predict–Observe–Explain教材研究](https://pubmed.ncbi.nlm.nih.gov/36406109/)は、予想・観察・説明を対話教材へ組み込んでいる。

このため、ドリルは「正解を表示→模倣」ではなく、予想 → 一本動かす → 操作前との差を観察 → 短い因果説明 → 別条件への転移、とする。

## カテゴリ首位水準の評価基準

1. **因果可視性**: 1操作後、5秒以内にどの断面が深く／浅く、前／後ろ、開く／閉じるか説明できる。
2. **同一モデル性**: 上・横・後ろ・断面・性能が同じセール面から計算され、頂点と計測値が一致する。
3. **クラス固有性**: 420のチョック／ジブ高さ、470のフォア／アフタープラー／ジブリードを一次資料と矛盾なく扱う。
4. **操作中の視認性**: デスクトップとモバイルの双方で三面図と断面を見たままスライダーを動かせる。
5. **学習移転**: クローズの設定をビーム／ブロードへ持ち越した誤りを、優先順を使って修正できる。
6. **共同利用**: 同じ条件と形状をURLで再現し、授業・チーム・コーチングで比較できる。
7. **誠実性**: 推定速度を実測ポーラやCFDと称さず、仮定と未モデル化要因を明記する。
8. **品質**: キーボード操作、色以外の区別、モバイル390px、テスト、性能・アクセシビリティ監査を通す。

## 今回の優先順位

1. 操作前ゴーストと深さ／最大位置／ツイスト差分
2. 入口角／出口角の追加
3. 現在の条件と形を復元できる共有URL
4. 三面図を固定したモバイル操作
5. 実利用者テストで語彙・誤解・モデル係数を再較正

最後の5は公開Web調査だけでは完了しない。競技者・指導者による実艇妥当性確認を次の検証段階とする。
