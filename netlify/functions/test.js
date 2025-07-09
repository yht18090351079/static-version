exports.handler = async (event, context) => {
    // 设置CORS头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // 处理OPTIONS请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        console.log('测试函数被调用');
        console.log('HTTP方法:', event.httpMethod);
        console.log('请求体:', event.body);
        console.log('查询参数:', event.queryStringParameters);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '测试函数正常工作',
                method: event.httpMethod,
                body: event.body,
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('测试函数错误:', error);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                message: '测试函数错误',
                error: error.message
            })
        };
    }
};
