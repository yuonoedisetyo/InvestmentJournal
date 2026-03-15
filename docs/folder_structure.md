backend/
├── app/
│   ├── Console/
│   │   ├── Commands/
│   │   │   └── SyncActivePortfolioPrices.php
│   │   └── Kernel.php
│   ├── Http/
│   │   └── Controllers/
│   │       ├── Controller.php
│   │       ├── PortfolioController.php
│   │       ├── TransactionController.php
│   │       ├── DividendController.php
│   │       └── PriceSyncController.php
│   ├── Models/
│   │   ├── Portfolio.php
│   │   ├── PortfolioPosition.php
│   │   ├── StockTransaction.php
│   │   ├── Dividend.php
│   │   ├── CashMutation.php
│   │   ├── Stock.php
│   │   └── StockPrice.php
│   ├── Repositories/
│   │   ├── PortfolioRepository.php
│   │   ├── PositionRepository.php
│   │   ├── TransactionRepository.php
│   │   ├── DividendRepository.php
│   │   ├── CashMutationRepository.php
│   │   └── PriceRepository.php
│   ├── Services/
│   │   ├── PortfolioService.php
│   │   ├── TransactionService.php
│   │   ├── DividendService.php
│   │   └── PriceSyncService.php
│   └── Support/
│       └── DecimalMath.php
├── config/
│   └── investment.php
├── database/
│   └── migrations/
├── routes/
│   └── api.php

cron/
└── sync_prices.php

db/
├── schema.sql
└── migration.sql
