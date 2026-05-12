/**
 * 模拟支付页面
 * 用于开发和测试环境，模拟支付过程
 */

import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentSuccess, getOrderByNo } from '@/lib/payment/service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const orderNo = searchParams.get('orderNo')
  const method = searchParams.get('method') || 'mock'
  const amount = searchParams.get('amount') || '0'

  if (!orderNo) {
    return new NextResponse('Missing orderNo', { status: 400 })
  }

  const order = await getOrderByNo(orderNo)
  if (!order) {
    return new NextResponse('Order not found', { status: 404 })
  }

  // 返回模拟支付页面HTML
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>模拟支付 - ${orderNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .header { margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #666; }
    .amount {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      margin: 30px 0;
    }
    .amount small { font-size: 24px; }
    .info {
      background: #f5f5f7;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: left;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .info-label { color: #666; }
    .info-value { color: #1a1a1a; font-weight: 500; }
    .btn-group { display: flex; gap: 12px; }
    .btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    .btn-success:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
    .btn-fail {
      background: #f5f5f7;
      color: #ef4444;
    }
    .btn-fail:hover { background: #fee2e2; }
    .method-badge {
      display: inline-block;
      background: #e0e7ff;
      color: #667eea;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 10px;
    }
    .notice {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #92400e;
    }
    .loading {
      display: none;
      font-size: 14px;
      color: #666;
      margin-top: 20px;
    }
    .loading.active { display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="method-badge">${method.toUpperCase()} 模拟支付</span>
      <h1 class="title">积分充值</h1>
      <p class="subtitle">订单号: ${orderNo}</p>
    </div>

    <div class="notice">
      ⚠️ 这是开发环境的模拟支付页面，不会产生真实扣款。
      点击"模拟支付成功"即可完成充值流程。
    </div>

    <div class="amount">
      <small>¥</small>${parseFloat(amount).toFixed(2)}
    </div>

    <div class="info">
      <div class="info-item">
        <span class="info-label">充值积分</span>
        <span class="info-value">${order.credits} 积分</span>
      </div>
      <div class="info-item">
        <span class="info-label">订单状态</span>
        <span class="info-value">${order.status}</span>
      </div>
      <div class="info-item">
        <span class="info-label">创建时间</span>
        <span class="info-value">${order.createdAt.toLocaleString('zh-CN')}</span>
      </div>
    </div>

    <div class="btn-group">
      <button class="btn btn-success" onclick="simulateSuccess()">
        模拟支付成功
      </button>
      <button class="btn btn-fail" onclick="simulateFail()">
        模拟支付失败
      </button>
    </div>

    <div class="loading" id="loading">处理中...</div>
  </div>

  <script>
    async function simulateSuccess() {
      const loading = document.getElementById('loading');
      loading.classList.add('active');

      try {
        const formData = new FormData();
        formData.append('orderNo', '${orderNo}');
        formData.append('status', 'TRADE_SUCCESS');
        formData.append('total_amount', '${amount}');
        formData.append('trade_no', 'MOCK_' + Date.now());

        const res = await fetch('/api/payment/callback?method=${method}', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          alert('支付成功！积分已发放到您的账户');
          window.close();
          // 如果是弹窗，通知父窗口
          if (window.opener) {
            window.opener.postMessage({ type: 'payment_success', orderNo: '${orderNo}' }, '*');
          }
        } else {
          alert('支付处理失败，请重试');
        }
      } catch (e) {
        alert('网络错误: ' + e.message);
      } finally {
        loading.classList.remove('active');
      }
    }

    function simulateFail() {
      alert('模拟支付失败，订单已取消');
      window.close();
    }
  </script>
</body>
</html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
