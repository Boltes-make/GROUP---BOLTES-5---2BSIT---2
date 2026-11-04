
console.log('SERVER FILE:', __filename);
console.log('WORKING DIRECTORY:', process.cwd());

const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
    console.log('HOME ROUTE WAS CALLED');

    res.json({
        message: 'HOPE ERP Backend is running!'
    });
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('TEST-DB ROUTE WAS CALLED');

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .limit(1);

        if (error) {
            console.error('SUPABASE ERROR:', error);

            return res.status(500).json({
                success: false,
                message: 'Supabase connection test failed.',
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
        }

        console.log('SUPABASE CONNECTION SUCCESSFUL');

        res.json({
            success: true,
            message: 'Supabase connection successful!',
            data: data
        });

    } catch (error) {
        console.error('SERVER ERROR:', error);

        res.status(500).json({
            success: false,
            message: 'Unexpected server error.',
            error: error.message,
            stack: error.stack
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`HOPE ERP Backend running on port ${PORT}`);
});
