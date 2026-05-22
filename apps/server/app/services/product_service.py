from app.schemas.order import ProductOut

PRODUCTS: dict[str, ProductOut] = {
    'pack_5': ProductOut(
        code='pack_5',
        name='5 次 AI 生成包',
        product_type='quota_pack',
        amount=3.9,
        description='适合轻量体验，快速生成几首弹唱谱。',
        benefits=['5 次 AI 写歌/配和弦', '保存到我的作品', '基础曲谱展示'],
    ),
    'pack_20': ProductOut(
        code='pack_20',
        name='20 次 AI 创作包',
        product_type='quota_pack',
        amount=9.9,
        description='适合持续创作，小红书/短视频内容灵感不断档。',
        benefits=['20 次 AI 生成', 'AI 写歌', 'AI 配和弦', '曲谱收藏'],
    ),
    'vip_month': ProductOut(
        code='vip_month',
        name='月会员',
        product_type='membership',
        amount=19.9,
        description='适合高频创作，解锁更多生成次数和高级能力。',
        benefits=['每月 300 次生成', '高级改编', '导出图片', '更多风格模板'],
    ),
    'vip_year': ProductOut(
        code='vip_year',
        name='年会员',
        product_type='membership',
        amount=99.0,
        description='适合长期创作，全年灵感不断电。',
        benefits=['每年 5000 次生成', '高级改编', '导出图片/PDF', '会员专属模板'],
    ),
}


def list_products() -> list[ProductOut]:
    return list(PRODUCTS.values())


def get_product(product_code: str) -> ProductOut | None:
    return PRODUCTS.get(product_code)
