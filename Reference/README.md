# Anime1 Video Verification CLI Tool (`anime-verifier`)

基於 `uv` 原生環境構建的現代化命令列工具，用於驗證 `anime1.me` 網站的影片載入流程。
本工具依循純淨架構設計（Clean Architecture），提供雙軌抓取器（高效 HTTP 與 DrissionPage 本機原生 Chrome 自動化）、強型別領域模型、純 DOM 解析器、API 請求模擬與串流可用性探針。

---

## 專案結構

```
Reference/
├── pyproject.toml                 # uv 專案設定與 CLI 進入點配置
├── README.md                      # 專案使用與架構說明文檔
├── anime_verifier/                # 核心套件 (單層 Package，扁平且高內聚)
│   ├── __init__.py                # 套件版本與公開宣告
│   ├── models.py                  # Pydantic V2 領域模型 (ApiRequestPayload, EpisodeArticle, StreamInfo)
│   ├── fetchers/                  # 抓取器介面與策略模式實作 (Interface & Strategies)
│   │   ├── __init__.py            # 統一導出 PageFetcher, get_fetcher
│   │   ├── base.py                # PageFetcher Protocol 與自定義例外
│   │   ├── http.py                # httpx 高性能 HTTP 抓取器 (支援 HTTP/2)
│   │   ├── browser.py             # DrissionPage 調用原生 Chrome 瀏覽器抓取器
│   │   └── auto.py                # 智慧降級策略 (AutoFallbackFetcher)
│   ├── parser.py                  # 純 DOM 解析器 (解析 site-main, article, vjscontainer, data-apireq)
│   ├── client.py                  # 後端 API 客戶端 (POST v.anime1.me/api 與 Session Cookies 收集)
│   ├── verifier.py                # 影片串流可用性探針 (Range 請求探測與 HTTP 206 校驗)
│   ├── service.py                 # 驗證流程調度協調器 (Orchestrator)
│   └── cli.py                     # Typer CLI 進入點與 Rich 視覺化輸出
└── tests/                         # 單元測試與回歸測試
    ├── __init__.py
    ├── test_models.py             # 測試 Payload 解碼、欄位驗證與 Form-data 轉換
    ├── test_parser.py             # 測試 HTML 結構解析與 vjscontainer 提取
    ├── test_fetchers.py           # 測試 Fetcher Protocol 與原生 Chrome 探測
    └── test_client.py             # 測試 API 參數封裝與 Cookie 處理
```

---

## 快速開始

### 1. 安裝與同步依賴
在 `Reference/` 資料夾內使用 `uv` 同步環境：
```powershell
uv sync
```

### 2. 執行完整驗證 (`verify`)
驗證動畫分類（目錄）或單一文章頁面中所有集數的影片載入流程：
```powershell
# 自動模式驗證特定分類（預設抓取所有集數）
uv run anime verify "https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3"

# 僅驗證前 2 集，並輸出詳細診斷資訊 (API Payload、Cookies、Range 資訊)
uv run anime verify "https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3" --limit 2 --verbose

# 強制使用本機原生 Chrome (DrissionPage) 抓取網頁
uv run anime verify "https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3" --fetcher browser --limit 1

# 輸出標準 JSON 格式供自動化程式管線消費
uv run anime verify "https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3" --limit 1 --json
```

### 3. 僅解析網頁元素與 Payload (`parse`)
不發送任何後端 API 請求，僅抓取網頁並解析出各集數之 `data-apireq` JSON 載荷：
```powershell
uv run anime parse "https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3"
```

### 4. 執行自動化測試
```powershell
uv run pytest
```
