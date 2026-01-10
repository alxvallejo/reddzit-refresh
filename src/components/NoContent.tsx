const NoContent = () => {
    return (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Reddit Posts Saved Yet!</h2>
            <p className="text-gray-600">
                Head to your <a href="https://reddit.com" className="text-[#ff4500] font-bold hover:underline" target="_blank" rel="noreferrer">Reddit</a>, 
                start saving stuff that you like or want to read later, and then check back!
            </p>
        </div>
    );
};

export default NoContent;
