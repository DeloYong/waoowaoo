import { describe, it, expect } from 'vitest'
import {
  signWechatRequest,
  buildWechatUnifiedOrderXml,
  parseWechatXmlResponse,
} from '@/lib/payment/providers/wechat-sdk'

describe('payment/providers/wechat-sdk', () => {
  it('signs request with MD5 (uppercase) when signType=MD5', () => {
    const params = {
      appid: 'wx1234567890',
      mch_id: '1900000109',
      nonce_str: '5K8264ILTKCH16CQ2502SI8ZNMTM67VS',
      body: '充值 100 积分',
      out_trade_no: 'PAY1',
      total_fee: '999',
      spbill_create_ip: '127.0.0.1',
      notify_url: 'https://example.com/callback',
      trade_type: 'NATIVE',
    }
    const apiKey = '192006250b4c09247ec02edce69f6a2d'

    const sign = signWechatRequest(params, apiKey, 'MD5')

    expect(sign).toMatch(/^[A-F0-9]{32}$/) // MD5 uppercase 32 chars
  })

  it('builds unified order XML with sorted fields and sign', () => {
    const xml = buildWechatUnifiedOrderXml({
      appId: 'wx1234567890',
      mchId: '1900000109',
      apiKey: '192006250b4c09247ec02edce69f6a2d',
      nonceStr: '5K8264ILTKCH16CQ2502SI8ZNMTM67VS',
      body: '充值 100 积分',
      outTradeNo: 'PAY1',
      totalFee: 999,
      spbillCreateIp: '127.0.0.1',
      notifyUrl: 'https://example.com/callback',
      tradeType: 'NATIVE',
    })

    expect(xml).toContain('<?xml')
    expect(xml).toContain('<appid>wx1234567890</appid>')
    expect(xml).toContain('<mch_id>1900000109</mch_id>')
    expect(xml).toContain('<out_trade_no>PAY1</out_trade_no>')
    expect(xml).toContain('<total_fee>999</total_fee>')
    expect(xml).toContain('<sign>')
    expect(xml).toContain('</xml>')
  })

  it('parses XML response to object', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <return_code>SUCCESS</return_code>
  <return_msg>OK</return_msg>
  <appid>wx1234567890</appid>
  <mch_id>1900000109</mch_id>
  <nonce_str>abc123</nonce_str>
  <sign>ABCDEF</sign>
  <result_code>SUCCESS</result_code>
  <prepay_id>wx201410272009395522657a690389285100</prepay_id>
  <trade_type>NATIVE</trade_type>
  <code_url>weixin://wxpay/bizpayurl?pr=abc</code_url>
</xml>`

    const parsed = await parseWechatXmlResponse(xml)
    expect(parsed.return_code).toBe('SUCCESS')
    expect(parsed.code_url).toBe('weixin://wxpay/bizpayurl?pr=abc')
    expect(parsed.prepay_id).toBe('wx201410272009395522657a690389285100')
  })
})
